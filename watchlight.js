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

const getFunctionBody = (f) => {
    const string = f.toString();
    if (string[string.length - 1] === "}") return string.substring(string.indexOf("{") + 1, string.length - 1);
    return string.substring(string.indexOf(">") + 1);
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
    constructor({type,...rest}) {
        Object.defineProperty(this,"type",{enumerable:true,value:type});
        Object.defineProperty(this,"timestamp",{enumerable:true,value:Date.now()});
        Object.defineProperty(this,"bubbles",{enumerable:true,value:typeof(rest.bubbles)==="boolean" ? rest.bubbles : true});
        Object.defineProperty(this,"cancelable",{enumerable:true,value:typeof(rest.cancelable)==="boolean" ? rest.cancelable : true});
        Object.defineProperty(this,"defaultPrevented",{enumerable:true,configurable:true,value:false});
        Object.defineProperty(this,"stop",{enumerable:true,configurable:true,value:false});
        Object.defineProperty(this,"stopImmediate",{enumerable:true,configurable:true,value:false});
        Object.entries(rest).forEach(([key,value]) => {
            if(value!==undefined) Object.defineProperty(this,key,{enumerable:true,writable:true,configurable:true,value});
        })
        if(this.target) Object.defineProperty(this,"currentTarget",{enumerable:true,configurable:true,value:this.target});
    }
    preventDefault() {
        if(this.synchronous) throw new TypeError(`preventDefault can't be called on synchronous event handler ${this.synchronous}`)
        Object.defineProperty(this,"defaultPrevented",{value:true});
    }
    stopPropagation() {
        if(this.synchronous) throw new TypeError(`stopPropagation can't be called on synchronous event handler ${this.synchronous}`)
        Object.defineProperty(this,"stop",{value:true});
    }
    stopImmediatePropagation() {
        if(this.synchronous) throw new TypeError(`stopImmediatePropagation can't be called on synchronous event handler ${this.synchronous}`)
        Object.defineProperty(this,"stopImmediate",{value:true});
    }
}

const isReactor = (target) => target && typeof(target)==="object" && target["__reactiveuid__"];

let Reactor = (target,domain={},{bind,confidence,parent,path=""}={}) => {
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
        local = {
            __reactiveuid__: uid(),
            valueOf() {
                return target.valueOf()
            },
            toJSON() {
                const json = target.toJSON ? target.toJSON() : target;
                if(json && confidence!==undefined) json.confidence = confidence;
                return json;
            },
            setValue(value) {
                proxy[Symbol.for("primitive")]=value;
            },
            retract({source}={}) {
                let result;
                if(type==="object") {
                    const event = new ReactorEvent({type:"retract",target:proxy,source});
                    local.handleEvent(event);
                    if(!event.defaultPrevented) {
                        if(trace.retract) console.log("Reactor:retract",target)
                        const wm = workingMemory.get(ctor);
                        if(wm) {
                            if(wm.has(proxy)) {
                                wm.delete(proxy);
                                result = proxy;
                                agenda.removeBindingsIncluding(proxy);

                            }
                        }
                        Object.entries(dependents).forEach(([key,objects]) => {
                            objects.forEach((dependent) => retract(dependent));
                            objects.clear();
                            delete dependents[key];
                        })
                    }
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
                    f:function(arg,{error,conditions,confidence}) {
                        if(error && typeof(error)==="object" && error instanceof Error) { throw error; }
                        return f.call(this,arg,{conditions,confidence})
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
            withOptions(options) {
                if(type==="function" && options.priority!==undefined) target.priority = options.priority;
                if(options.confidence!==undefined) confidence = options.confidence;
                return proxy;
            },
            withConditions(conditions) {
                conditions
                    .forEach((condition,object) => Object.keys(condition)
                        .forEach((property) => object.addDependency({target:proxy,property})));
                return proxy;
            },
            addEventListener(eventName,listener,{synchronous,once}={}) {
                if(!(eventName in eventTypes)) throw new TypeError(`Invalid event name: ${eventName}`);
                (listeners[eventName] ||= new Map()).set(listener,{listener,options:{synchronous,once}});
                return proxy;
            },
            hasEventListener(eventName,listener) {
                if(!(eventName in eventTypes)) throw new TypeError(`Invalid event name: ${eventName}`);
                return [...(listeners[eventName] ||= new Map()).keys()].some((key) => {
                    return listener===key || listener.name===key.name || listener===key.name || listener+""===key+"";
                })
            },
            postMessage(eventName,options={}) {
                local.handleEvent(new ReactorEvent({type:eventName,...options}));
            },
            removeEventListener(eventName,listener) {
                if(!(eventName in eventTypes)) throw new TypeError(`Invalid event name: ${eventName}`);
                [...(listeners[eventName] ||= new Map()).keys()].forEach((key) => {
                    if(listener===key || listener.name===key.name || listener===key.name  || listener+""===key+"") listeners[eventName].delete(key);
                })
                return proxy;
            },
            handleEvent(event) {
                Object.defineProperty(event,"currentTarget",{configurable:true,value:proxy});
                if((!listeners[event.type] || [...listeners[event.type].values()].every(({listener,options}) => {
                    if(options.synchronous) {
                        Object.defineProperty(event,"synchronous",{configurable:true,value:listener})
                    }
                    options.synchronous ? listener(event) : setTimeout(()=> listener(event));
                    if(options.once) local.removeEventListener(listener)
                    return !event.stopImmediate && !event.defaultPrevented;
                }))) {
                    if(parent && !event.stop && !event.stopImmediate && !event.defaultPrevented) parent.handleEvent(event);
                }
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
        doThen = (result,{binding,confidence,conditions}) => {
            let error;
            result = Array.from(continues).reduce(async (result,{f,synchronous}) => {
                result = await result;
                if (result) {
                    try {
                        if(result.toString()==="()=>proxy") result = result();
                    } catch(e) {

                    }
                    if (synchronous) {
                        try {
                            result = f.call(proxy, result, {error,conditions,justification:binding,confidence});
                        } catch (e) {
                            error = e;
                        }
                    } else {
                        result = new Promise(async (resolve, reject) => {
                            try {
                                const value = await f.call(proxy, result, {error,conditions,confidence});
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
                if(property==="confidence") return confidence;
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
                if(property==="prototype" || property.toString()=="Symbol(Symbol.unscopables)") return value;
                const vtype = typeof(value);
                if(value && vtype==="object") value = childReactors[property] ||= Reactor(value,undefined,{parent:proxy,path:path ? path + "." + property : property}); // only create one reactor
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
                if(property==="confidence") throw new TypeError(`confidence is a read-only reserved property of watchlight reactive data and rules`);
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
                    let event;
                    if(oldValue===undefined) {
                        event = new ReactorEvent({type:"defineProperty",target:proxy,property,value})
                    } else {
                        event = new ReactorEvent({type:"change",target:proxy,property,value,oldValue})
                    }
                    local.handleEvent(event);
                    if(!event.defaultPrevented) {
                        if(setprimitive) target = new ctor(value);
                        else target[property] = value;
                        if(childReactors[property]) {
                            childReactors[property] = Reactor(value)
                        }
                        if(dependents[property]) {
                            dependents[property].forEach((target) => retract(target,{source:proxy}));
                            dependents[property].clear();
                        }
                        ctor.functions[property]?.forEach((f) => f.with(proxy));
                        observers[property]?.forEach((f) => f.stopped || f());
                    }
                } else if(typeof(value)==="function" && value.valueOf) { // support for dependency "cells" on a table
                    observers[property]?.forEach((f) => f.stopped || f());
                    return value;
                }
                return true;
            },
            deleteProperty(target,property) {
                const oldValue = target[property];
                delete target[property];
                if(type==="object") {
                    const event = new ReactorEvent({type:"delete",target:proxy,property,oldValue});
                    local.handleEvent(event);
                    if(!event.defaultPrevented) {
                        dependents[property]?.forEach((target) => retract(target,{source:proxy}));
                        dependents[property]?.clear();
                        ctor.functions[property]?.forEach((f) => f.with(proxy));
                    }
                }
                return true;
            },
            apply(target, thisArg, [binding,...args]) {
                if(target===_Reactor) return target.call(thisArg,binding,...args);
                if(ctors.length===0) return Reactor(new target(binding,...args));
                stats.tested++;
                CURRENTWHEN = proxy;
                let result = target.call(thisArg,binding,...args);
                CURRENTWHEN = null;
                if(result) {
                    stats.succeeded++;
                    const event = new ReactorEvent({type:"fire",target:proxy,thisArg,argumentList:[binding,...args]});
                    local.handleEvent(event);
                    if(!event.defaultPrevented) {
                        const cf = confidence>0 ? Object.values(binding).reduce((cf,value) => Math.min(cf,value.confidence===undefined ? 1 : value.confidence),1) * confidence : undefined;
                        result = doThen(result,{binding,confidence:cf,conditions:new Map(conditions)});
                    }
                    //if(!bindings.some((b) => Object.entries(binding).every(([key,value]) => b[key]===value))) {
                     //   bindings[bindings.length] = binding; // slightly faster than push
                    //}
                } else {
                    //bindings = bindings.filter((b) => !Object.entries(binding).every(([key,value]) => b[key]===value))
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
const _Reactor = Reactor;
Reactor = Reactor(Reactor);
const eventTypes = {
    defineProperty: true,
    change: true,
    delete: true,
    fire: true,
    retract: true
};
Reactor.registerEventType = function(eventName) {
    eventTypes[eventName] = true;
}
Reactor.unregisterEventType = function(eventName) {
    delete eventTypes[eventName];
}


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

const reactive = (target,{confidence}={}) => {
    const type = typeof(target);
    if(type==="function") return Reactor(target,{},{confidence});
    if(!target || type!=="object") throw new TypeError(`Can't create reactive object from ${typeof(target)} ${target}`);
    return Reactor(target);
}

const assert = (target,{source,confidence}={}) => {
    const value = isReactor(target) ? target : reactive(target),
        ctor = Object.getPrototypeOf(target).constructor;
    if(confidence) value.withOptions({confidence});
    let wm = workingMemory.get(ctor);
    if(!wm) {
        wm = new Set();
        workingMemory.set(ctor,wm);
    }
    const event = new ReactorEvent({type:"assert",source,target:value});
    Reactor.handleEvent(event);
    if(!event.defaultPrevented) {
        wm.add(value);
        functionsByClass.getAll(ctor).forEach((f) => f.with(value));
    }
    return value;
}

const retract = (target,{source}={}) => {
    return target.retract({source});
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

const when = (condition,domain={},{bind,confidence}={}) => {
    const when = function(objects) {
        const bool = condition(objects),
            type = typeof(bool);
        if(type!=="boolean") throw new TypeError(`when function must return a boolean not ${type}: ${condition}`);
        if(bool) return objects;
    }
    when.condition = condition;
    return Reactor(when,domain,{bind,confidence});
}

const whilst = (condition,result,domain={},{bind,confidence,onassert}={}) => {
    const proxy = when(condition,domain,{bind,confidence})
        .then((objects,{conditions,confidence}={}) => {
            const resultobjects = result.call(proxy,objects);
            Object.entries(resultobjects).forEach(([key,data]) => {
                if(!(key in objects)) {
                    if(data && data.constructor===Array) { // do not use Array.isArray, there may be custom arrays in domain
                        data.forEach((item,i) => { // confidence may have been set using withOptions, so use proxy.confidence
                            if(onassert) {
                                const event = new ReactorEvent({type:"assert",source:proxy,target:item});
                                onassert(event);
                                if(event.defaultPrevented) return;
                            }
                            return data[i] = assert(item,{source:proxy}).withConditions(conditions).withOptions({confidence});
                        })
                    } else if(data) {
                        if(onassert) {
                            const event = new ReactorEvent({type:"assert",source:proxy,target:data});
                            onassert(event);
                            if(event.defaultPrevented) return;
                        }
                        resultobjects[key] = assert(data,{source:proxy}).withConditions(conditions).withOptions({confidence});
                    }
                }
            });
            return resultobjects;
        });
    return proxy;
}

const observer = (f,thisArg,...args) => {
    let observer, errors = (e) => { throw(e) };
    if(Object.getPrototypeOf(f)===Object.getPrototypeOf(async ()=>{})) {
        observer = async function(...args) {
            if (CURRENTOBSERVER !== observer  && !observer.stopped) {
                let result;
                CURRENTOBSERVER = observer;
                try {
                    result = await f.call(this, ...args);
                } catch (e) {
                    result = errors(e);
                }
                CURRENTOBSERVER = null;
                return result;
            }
        }
        if (f.name) observer = AsyncFunction(`return async function ${f.name}(...args) { return (${observer}).call(this,...args) }`)();
    } else {
        observer = function (...args) {
            if (CURRENTOBSERVER !== observer && !observer.stopped) {
                let result;
                CURRENTOBSERVER = observer;
                try {
                    result = f.call(this, ...args);
                } catch(e) {
                    result = errors(e);
                }
                CURRENTOBSERVER = null;
                return result;
            }
        }
        if (f.name && f.name!=="anonymous") observer = Function(`return function ${f.name}(...args) { return (${observer}).call(this,...args) }`)();
    }
    if(thisArg!==undefined) observer = observer.bind(thisArg,...args);
    Object.defineProperty(observer,"stop",{configurable:true,writable:true,value:()=>observer.stopped = true});
    Object.defineProperty(observer,"start",{configurable:true,writable:true,value:()=> delete observer.stopped});
    Object.defineProperty(observer,"withOptions",{configurable:true,writable:true,value:function({onerror}={}) { errors=onerror; return observer; }});
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

export {reactive,when,whilst,assert,exists,not,retract,observer,unobserve,run,stop,Partial,deepEqual,getFunctionBody,Reactor}