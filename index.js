/*
    Watchlight - A light weight, comprehensive, reactive framework for business logic.
    Copyright (C) 2022  Simon Y. Blackwell

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
    */

// this uid is fine for use inside a single app, i.e. data never shared with anything else
const uid = (length=16) => {
    return Math.ceil(Math.random() * Date.now()).toPrecision(length).toString().replace(".", "")
}

function* cartesian(head, ...tail) {
    const remainder = tail.length > 0 ? cartesian(...tail) : [[]];
    for (let r of remainder) for (let h of head) yield [h, ...r];
}

function deepEqual(a,b,seen=new Set()) {
    if(a===b) return true;
    const type = typeof(a);
    if(type==="function" || type!==typeof(b) || (a && !b) || (b && !a)) return false;
    if(type==="number" && isNaN(a) && isNaN(b)) return true;
    if(a && type==="object") {
        if(seen.has(a)) return true;
        seen.add(a);
        if(a.constructor!==b.constructor || a.length!==b.length || a.size!==b.size) return false;
        if(a instanceof Date) a.getTime() === b.getTime();
        if(a instanceof RegExp) return a.toString() === b.toString();
        if(a instanceof Set) {
            for(const avalue of [...a]) {
                if(![...b].some((bvalue) => deepEqual(avalue,bvalue,seen))) return false;
            }
            return true;
        }
        if(a instanceof Map) {
            for(const [key,value] of [...a]) {
                if(!deepEqual(b.get(key),value,seen)) return false;
            }
            return true;
        }
        for(const key in a) {
            if(!deepEqual(a[key],b[key],seen)) return false;
        }
        return true;
    }
    return false;
}

let CURRENTWHEN,CURRENTOBSERVER;

class WorkingMemory extends Map { // all reactive objects groups by constructor
    constructor(...args) {
        super(...args);
    }
    set(ctor,instances)  {
        ctor.__exemplar__ = Object.create(ctor.prototype);
        return super.set(ctor,instances);
    }
    getInstances(ctor) {
        let items = [];
        this.forEach((value,key) => {
            if(key.__exemplar__ instanceof ctor) items = items.concat([...value])
        })
        items.has = items.includes;
        return items;
    }
}
const workingMemory = new WorkingMemory();

class FunctionsByClass extends Map { // all functions associated with a given class based on being used in arguments
    constructor(...args) {
        super(...args);
    }
    set(ctor,instances)  {
        ctor.__exemplar__ = Object.create(ctor.prototype);
        return super.set(ctor,instances);
    }
    getAll(ctor) {
        const object = Object.create(ctor.prototype);
        let items = [];
        this.forEach((functions,ctor) => {
            if(object instanceof ctor) items = items.concat(...functions)
        })
        items.has = items.includes;
        return items;
    }
}
const functionsByClass = new FunctionsByClass();

const Binding = (object) => {
    Object.defineProperty(object,"__reactiveuid__",{enumerable:false,value:Object.values(object).reduce((uid,value) => uid ? uid+"."+value.__reactiveuid__ : + value.__reactiveuid__,null)});
    return object;
}

class Agenda extends Map {
    clear(f) {
        if(f) {
            this.delete(f);
        } else {
            super.clear();
        }
    }
    add(f,binding) {
        let bindings = this.get(f);
        if(!bindings) {
            bindings = {};
            this.set(f,bindings)
        }
        if(trace.agenda) console.log("Agenda:push",f.name||"anonymous",binding);
        if(this.restart) {
            if(this.restart.priority<f.priority) this.restart = f;
        } else {
            this.restart = f;
        }
        bindings[binding.__reactiveuid__] = binding;
    }
    removeBindingsIncluding(object) {
        this.forEach((bindings) => {
            for(const key in bindings) {
                const parts = key.split(".");
                if(parts.includes(object.__reactiveuid__)) {
                    delete bindings[key];
                }
            }
        })
    }
    async run({timeout,limit=-1}) {
        if(limit===0) {
            stop();
            return;
        }
        agenda.run.timeout = null;
        const pending = Array.from(this).sort(([a],[b]) => b.priority - a.priority);
        for(const [f,bindings] of pending) {
            if(this.restart && this.restart.priority > f.priority) {
                this.restart = null;
                break;
            }
            let haskey;
            for(const key in bindings) {
                haskey = true;
                const binding = bindings[key];
                delete bindings[key];
                if(trace.agenda) console.log("Agenda:call",f.name||"anonymous",binding);
                await f.call(f,binding);
                if(this.restart && this.restart.priority > f.priority) break;
            }
            if(!haskey) {
                if(trace.agenda) console.log("Agenda:delete",f.name||"anonymous");
                this.delete(f);
            }
        }
        if(agenda.run.timeout!==-1) {
            limit--;
            if(pending.length>0 || limit>0) {
                clearTimeout(agenda.run.timeout);
                agenda.run.timeout = setTimeout(() => this.run({timeout,limit}),timeout);
            } else {
                stop();
            }
        }
    }
}
const agenda = new Agenda();

class ReactorEvent {
    constructor({event,...rest}) {
        this.event = event;
        Object.assign(this,rest);
    }
}

const isReactor = (target) => target && typeof(target)==="object" && target["__reactiveuid__"];

const Reactor = (target,domain={},{bind}={}) => {
    const type= typeof(target);
    if(!target || (type!=="object" && type!=="function")) return target;
    if(target.__reactiveuid__) return target;
    let bindings = []; // arguments that have satisfied the function
    const ctor = Object.getPrototypeOf(target).constructor,
        dependents = {}, // dependent objects by key that can change
        observers = {},
        listeners = {},
        childReactors = {},
        conditions = new Map(), // objects as keys, map of properties and values accessed as values, only valid during bound execution
        ctors = Object.entries(domain), // the domain of arguments for a function
        continues = new Set(), // actions to invoke when a reactive object changes or a reactive function is satisfied
        whens = new Map(),
        handleEvent = (event) => {
            listeners[event.event]?.forEach(({listener,options}) => options.synchronous ? listener(event) : setTimeout(()=> listener(event)))
        },
        local = {
            __reactiveuid__: uid(),
            valueOf() {
                return target.valueOf()
            },
            setValue(value) {
                proxy[Symbol.for("primitive")]=value;
            },
            retract() {
                let result;
                if(type==="object") {
                    if(trace.retract) console.log("Reactor:retract",target)
                    const wm = workingMemory.get(ctor);
                    if(wm) {
                        if(wm.has(proxy)) {
                            wm.delete(proxy);
                            result = proxy;
                            agenda.removeBindingsIncluding(proxy);
                            handleEvent(new ReactorEvent({event:"retract",proxy,target}));
                        }
                    }
                    Object.entries(dependents).forEach(([key,objects]) => {
                        objects.forEach((dependent) => retract(dependent));
                        objects.clear();
                        delete dependents[key];
                    })
                }
                return result;
            },
            when(f,domain) {
                let w = whens.get(f);
                if(!w) {
                    if(domain) {
                        w = when((options) => f({bound:proxy,...options}),domain);
                    } else {
                        w = when(({target}) => f(target),{target:ctor},{bind:proxy})
                            .then(({target}) => target);
                    }
                    whens.set(f,w);
                    w.with(proxy);
                }
                return w;
            },
            then(f,{synchronous}={}) {
                if(f.toString().includes("[native code]")) { // happens when Javascript engine treats reactor as a Promise
                    f(()=>proxy);
                    return proxy;
                }
                continues.add({
                    f:function(arg,{error,conditions}) {
                        if(error && typeof(error)==="object" && error instanceof Error) { throw error; }
                        return f.call(this,arg,{conditions})
                    }
                    ,synchronous
                });
                return proxy;
            },
            catch(f) {
                continues.add({
                    f:function(arg,{error}) {
                        return error && typeof(error)==="object" && error instanceof Error ? f.call(this,error): arg}
                });
                return proxy;
            },
            addCondition({object,property,value}) {
                let condition = conditions.get(object);
                if(!condition) {
                    condition = {};
                    conditions.set(object,condition);
                }
                condition[property] = value;
            },
            withOptions({priority}) {
                target.priority = priority;
                return proxy;
            },
            withConditions(conditions) {
                conditions
                    .forEach((condition,object) => Object.keys(condition)
                        .forEach((property) => object.addDependency({target:proxy,property})));
                return proxy;
            },
            addEventListener(eventName,listener,{synchronous}={}) {
                if(!["defineProperty","change","delete","fire","retract"].includes(eventName)) throw new TypeError(`Invalid event name: ${eventName}`);
                (listeners[eventName] ||= new Map()).set(listener,{listener,options:{synchronous}});
                return proxy;
            },
            hasEventListener(event,listener) {
                if(!["defineProperty","change","delete","fire","retract"].includes(eventName)) throw new TypeError(`Invalid event name: ${eventName}`);
                return (listeners[event] ||= new Map()).has(listener);
            },
            removeEventListener(event,listener) {
                if(!["defineProperty","change","delete","fire","retract"].includes(eventName)) throw new TypeError(`Invalid event name: ${eventName}`);
                (listeners[event] ||= new Map()).delete(listener);
                return proxy;
            },
            addDependency({target,property}) {
                dependents[property] ||= new Set();
                dependents[property].add(target);
                return proxy;
            },
            with(object) { // exec a function for a specific object
                if(bind && bind!==object) return;
                const vnames = ctors.reduce((vnames,[vname,ctor]) => {
                    if(object instanceof ctor) vnames.push(vname);
                    return vnames;
                },[]);
                vnames.forEach((name) => {
                    const wm = ctors.reduce((wm,[vname,ctor]) => {
                        if(vname===name) wm[vname] = [object];
                        else wm[vname] = workingMemory.getInstances(ctor)||new Set();
                        return wm;
                    },[]);
                    for(const objects of cartesian(...Object.values(wm))) {
                        if(objects.length===vnames.length) {
                            const binding = objects.reduce((binding,object,index) => {
                                const vname = ctors[index][0];
                                binding[vname] = object;
                                return binding;
                            },{});
                            exec(Binding(binding));
                        }
                    }
                })
                return proxy;
            }
        },
        exec = (binding) => {
            if(binding) {
                agenda.add(proxy,binding);
            } else { // generate all possible combinations of bindings and add to agenda
                agenda.clear(proxy);
                const wm = ctors.reduce((wm,[vname,ctor]) => { wm[vname] = workingMemory.getInstances(ctor)||[]; return wm; },[]);
                for(const objects of cartesian(...Object.values(wm))) {
                    if(objects.length===ctors.length) {
                        const binding = objects.reduce((binding,object,index) => {
                            const vname = ctors[index][0];
                            binding[vname] = object;
                            return binding;
                        },{});
                        agenda.add(proxy,Binding(binding));
                    }
                }
            }
        },
        doThen = (result,binding) => {
            let error;
            const cndtns =  new Map(conditions);
            result = Array.from(continues).reduce(async (result,{f,synchronous}) => {
                result = await result;
                if (result) {
                    try {
                        if(result.toString()==="()=>proxy") result = result();
                    } catch(e) {

                    }
                    if (synchronous) {
                        try {
                            result = f.call(proxy, result, {error,conditions:cndtns,justification:binding});
                        } catch (e) {
                            error = e;
                        }
                    } else {
                        result = new Promise(async (resolve, reject) => {
                            try {
                                const value = await f.call(proxy, result, {error,conditions:cndtns});
                                if(error && value===undefined) reject(error);
                                error = null;
                                resolve(value);
                            } catch (e) {
                                error = e;
                                resolve(error);
                            }
                        })
                    }
                }
                return result;
            },result);
            return result;
        };
        const proxy = new Proxy(target, {
            get(_,property) { // keeping target outside proxy for get/set allows us to update it for primitives
                if(property.toString()==="Symbol(Symbol.toPrimitive)") {
                    if(type==="object") {
                        property = "Symbol(primitive)";
                        if(CURRENTWHEN) {
                            const reactors = ctor.functions[property] ||= new Set();
                            reactors.add(CURRENTWHEN);
                            CURRENTWHEN.addCondition({object:proxy,property,value:target.valueOf()})
                        } else if(CURRENTOBSERVER) {
                            (observers[property] ||= new Map())
                                .set(CURRENTOBSERVER,CURRENTOBSERVER);
                        }
                    }
                    return target.valueOf.bind(target);
                }
                let value = local[property];
                if(value!==undefined) return value;
                value = target[property];
                if(property==="prototype") return value;
                const vtype = typeof(value);
                if(value && vtype==="object") value = childReactors[property] ||= Reactor(value); // only create one reactor
                if(type==="object") {
                    if(CURRENTWHEN) {
                        const reactors = ctor.functions[property] ||= new Set();
                        reactors.add(CURRENTWHEN);
                        if(vtype!=="function" && value!==undefined) CURRENTWHEN.addCondition({object:proxy,property,value});
                    } else if(CURRENTOBSERVER) {
                        (observers[property] ||= new Map()).set(CURRENTOBSERVER,CURRENTOBSERVER);
                    }
                }
                return value;
            },
            set(_,property,value) {
                if(value===undefined) {
                    delete proxy[property];
                    return true;
                }
                let oldValue,
                    setprimitive;
                if(typeof(property)==="symbol" && property.toString()==="Symbol(primitive)") {
                    property = "Symbol(primitive)";
                    if (target instanceof Number || target instanceof String || target instanceof Boolean) {
                        setprimitive = true;
                        oldValue = target.valueOf();
                    } else {
                        throw new TypeError(`set Symbol(primitive) called on non-primitive object`)
                    }
                } else {
                    oldValue = target[property]
                }
                if(oldValue!==value) {
                    if(setprimitive) target = new ctor(value);
                    else target[property] = value;
                    if(childReactors[property]) {
                        childReactors[property] = Reactor(value)
                    }
                    if(dependents[property]) {
                        dependents[property].forEach((target) => retract(target));
                        dependents[property].clear();
                    }
                    if(oldValue===undefined) handleEvent(new ReactorEvent({event:"defineProperty",target,reactor:proxy,property,value}));
                    else handleEvent(new ReactorEvent({event:"change",target,reactor:proxy,property,value,oldValue}));
                    ctor.functions[property]?.forEach((f) => f.with(proxy));
                    observers[property]?.forEach((f) => f.stopped || f());
                } else if(typeof(value)==="function" && value.valueOf) { // support for dependency "cells" on a table
                    observers[property]?.forEach((f) => f.stopped || f());
                }
                return true;
            },
            deleteProperty(target,property) {
                const oldValue = target[property];
                delete target[property];
                if(type==="object") {
                    dependents[property]?.forEach((target) => retract(target));
                    dependents[property]?.clear();
                    handleEvent(new ReactorEvent({event:"delete",target,reactor:proxy,property,oldValue}));
                    ctor.functions[property]?.forEach((f) => f.with(proxy));
                }
                return true;
            },
            apply(target, thisArg, [binding,...args]) {
                if(ctors.length===0) return Reactor(new target(binding,...args));
                stats.tested++;
                CURRENTWHEN = proxy;
                let result = target.call(thisArg,binding,...args);
                CURRENTWHEN = null;
                if(result) {
                    handleEvent(new ReactorEvent({event:"fire",target,reactor:proxy,thisArg,argumentList:[binding,...args]}));
                    stats.succeeded++;
                    result = doThen(result,binding);
                    if(!bindings.some((b) => Object.entries(binding).every(([key,value]) => b[key]===value))) {
                        bindings[bindings.length] = binding; // slightly faster than push
                    }
                } else {
                    bindings = bindings.filter((b) => !Object.entries(binding).every(([key,value]) => b[key]===value))
                }
                conditions.clear();
                return result;
            },
            construct(target,args) {
                return Reactor(new target(...args));
            }
        });
    ctor.functions ||= {};
    if(type==="function") {
        if(ctors.length>0) {
            target.priority = 0;
            ctors.forEach(([_,ctor]) => {
                let functions = functionsByClass.get(ctor);
                if(!functions) {
                    functions = new Set();
                    functionsByClass.set(ctor,functions);
                }
                functions.add(proxy)
            });
            try { // force execution so dependencies can be determined
                const binding = {};
                ctors.forEach(([key,ctor]) =>binding[key] = Reactor(Object.create(ctor.prototype)));
                CURRENTWHEN = proxy;
                target.call(proxy,binding);
                CURRENTWHEN = null;
            } catch(e) {

            }
            exec(); // run it in case working memory data already exists
        }
    }
    return proxy;
}
const listeners = {};
Reactor.handleEvent = function(event) {
    listeners[event.event]?.forEach(listener => setTimeout(()=> listener(event)))
};
Reactor.addEventListener = function(event,f) {
    (listeners[event] ||= new Set()).add(f);
    return Reactor;
};
Reactor.removeEventListener = function(event,f) {
    (listeners[event] ||= new Set()).delete(f);
    return Reactor;
};


let stats = {tested:0,succeeded:0,startTime:Date.now()},
    trace = {};
const run = (options={}) => {
    trace = {...options.trace||{}};
    stats = {tested:0,succeeded:0,startTime:Date.now()};
    if(trace.run) console.log("run:start", stats);
    agenda.run({...options});
}

const stop = () => {
    clearTimeout(agenda.run.timeout);
    agenda.run.timeout=-1;
    stats.endTime = Date.now();
    stats.secondsRunning = (stats.endTime - stats.startTime) / 1000;
    stats.testsPerSecond =  stats.tested /  stats.secondsRunning;
    stats.firesPerSecond =  stats.succeeded /  stats.secondsRunning;
    if(trace.run) console.log("run:stop", stats)
};

const reactive = (target) => {
    const type = typeof(target);
    if(type==="function") return Reactor(target);
    if(!target || type!=="object") throw new TypeError(`Can't create reactive object from ${typeof(target)} ${target}`);
    return Reactor(target);
}

const assert = (target) => {
    const value = isReactor(target) ? target : reactive(target),
        ctor = Object.getPrototypeOf(target).constructor;
    let wm = workingMemory.get(ctor);
    if(!wm) {
        wm = new Set();
        workingMemory.set(ctor,wm);
    }
    wm.add(value);
    Reactor.handleEvent(new ReactorEvent({event:"assert",value}));
    functionsByClass.getAll(ctor).forEach((f) => f.with(value));
    return value;
}

const retract = (target) => {
    return target.retract();
}
const exists = (object,test) => {
    const entries = Object.entries(object),
        wm = workingMemory.get(Object.getPrototypeOf(object).constructor)||[];
    for(const item of wm) {
        if(test) {
            if(test(object,item)) return true;
        } else if(item.equals && object.equals) {
            if(object.equals(item)) return true;
        } else if(entries.every(([key,value]) => deepEqual(item[key],value))) {
            return true;
        }
    }
    return false;
}

const not = (object,test) => !exists(object,test);

const when = (target,domain={},{bind}={}) => {
    const when = function(objects) {
        const bool = target(objects),
            type = typeof(bool);
        if(type!=="boolean") throw new TypeError(`when function must return a boolean not ${type}: ${target}`);
        if(bool) return objects;
    }
    when.condition = target;
    return Reactor(when,domain,{bind});
}

const whilst = (target,result,domain={},{bind,onassert}={}) => {
    const proxy = when(target,domain,{bind})
        .then((objects,{conditions}={}) => {
            let data = result(objects);
            if(data && data.constructor===Array) { // do not use Array.isArray, they may be custom domain
                data = data.map((data) => {
                    const proxy =  assert(data).withConditions(conditions);
                    if(onassert) onassert(new ReactorEvent({event:"assert",proxy,target:data}));
                    return proxy;
                })
            } else if(data) {
                const proxy = assert(data).withConditions(conditions);
                if(onassert) onassert(new ReactorEvent({event:"assert",proxy,target:data}));
                data = proxy;
            }
            return data;
        });
    return proxy;
}

const observer = (f,thisArg,...args) => {
    let observer;
    if(Object.getPrototypeOf(f)===Object.getPrototypeOf(async ()=>{})) {
        observer = async function(...args) {
            if (CURRENTOBSERVER !== observer) {
                    CURRENTOBSERVER = observer;
                const result = await f.call(this, ...args);
                CURRENTOBSERVER = null;
                return result;
            }
        }
        if (f.name) observer = AsyncFunction(`return async function ${f.name}(...args) { return (${observer}).call(this,...args) }`)();
    } else {
        observer = function (...args) {
            if (CURRENTOBSERVER !== observer) {
                CURRENTOBSERVER = observer;
                const result = f.call(this, ...args);
                CURRENTOBSERVER = null;
                return result;
            }
        }
        if (f.name && f.name!=="anonymous") observer = Function(`return function ${f.name}(...args) { return (${observer}).call(this,...args) }`)();
    }
    Object.defineProperty(observer,"stop",{configurable:true,writable:true,value:()=>observer.stopped===true});
    Object.defineProperty(observer,"start",{configurable:true,writable:true,value:()=>delete observer.stopped})
    if(thisArg!==undefined) observer = observer.bind(thisArg,...args);
    observer();
    return observer;
}

const unobserve = (f) => {
    if(Object.getPrototypeOf(f)===Object.getPrototypeOf(async ()=>{})) {
        async function unobserver(...args) {
            const current = CURRENTOBSERVER;
            CURRENTOBSERVER = null;
            const result = await f(...args);
            CURRENTOBSERVER = current;
            return result;
        }
        return unobserver();
    }
    function unobserver(...args) {
        const current = CURRENTOBSERVER;
        CURRENTOBSERVER = null;
        const result = f(...args);
        CURRENTOBSERVER = current;
        return result;
    }
    return unobserver();
}

const Partial = (constructor,data) => {
    const instance = Object.create(constructor.prototype);
    if(Array.isArray(data)) data.forEach((item) => instance.push(item))
    else Object.assign(instance,data);
    Object.defineProperty(instance,"constructor",{configurable:true,writable:true,value:constructor.prototype.constructor||constructor});
    return constructor.__reactiveuid__ ? Reactor(instance) : instance;
}

export {reactive,when,whilst,assert,exists,not,retract,observer,unobserve,run,stop,Partial,deepEqual}