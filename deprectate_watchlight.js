/*
    Watchlight - A light weight, comprehensive, observable framework for business logic.
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



let CURRENTWHEN,CURRENTOBSERVER;

/* class WorkingMemory extends Map { // all observable objects groups by constructor
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
} */
//const workingMemory = new WorkingMemory();

/* class FunctionsByClass extends Map { // all functions associated with a given class based on being used in arguments
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
} */
//const functionsByClass = new FunctionsByClass();

const Binding = (object) => {
    Object.defineProperty(object,"__observableuid__",{enumerable:false,value:Object.values(object).reduce((uid,value) => uid ? uid+"."+value.__observableuid__ : + value.__observableuid__,null)});
    return object;
}

class Agenda extends Map {
    constructor() {
        super();
        this.stats ||= {tested:0,succeeded:0,startTime:Date.now()};
    }
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
        if(this.trace?.agenda) console.log("Agenda:push",f.name||"anonymous",binding);
        if(this.restart) {
            if(this.restart.priority<f.priority) this.restart = f;
        } else {
            this.restart = f;
        }
        bindings[binding.__observableuid__] = binding;
    }
    removeBindingsIncluding(object) {
        this.forEach((bindings) => {
            for(const key in bindings) {
                const parts = key.split(".");
                if(parts.includes(object.__observableuid__)) {
                    delete bindings[key];
                }
            }
        })
    }
    async run({timeout,limit=-1}) {
        this.stats ||= {tested:0,succeeded:0,startTime:Date.now()};
        if(agenda?.trace.run) console.log("run", this.stats);
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
                if(this.trace?.agenda) console.log("Agenda:call",f.name||"anonymous",binding);
                await f.call(f,binding);
                if(this.restart && this.restart.priority > f.priority) break;
            }
            if(!haskey) {
                if(this.trace?.agenda) console.log("Agenda:delete",f.name||"anonymous");
                this.delete(f);
            }
        }
        if(agenda.run.timeout!==-1) {
            limit--;
            if(pending.length>0 || limit>0) {
                clearTimeout(agenda.run.timeout);
                agenda.run.timeout = setTimeout(() => this.run({timeout,limit}),timeout);
            } else {
                this.stop();
            }
        }
    }
    stop() {
        clearTimeout(agenda.run.timeout);
        agenda.run.timeout=-1;
        const stats = this.stats;
        stats.endTime = Date.now();
        stats.secondsRunning = (stats.endTime - stats.startTime) / 1000;
        stats.testsPerSecond =  stats.tested /  stats.secondsRunning;
        stats.firesPerSecond =  stats.succeeded /  stats.secondsRunning;
        if(this.trace?.stop) console.log("stop", stats);
        delete this.stats;
    };
}
const agenda = new Agenda();

class ObservableEvent {
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

const isObservable = (target) => target && typeof(target)==="object" && target["__observableuid__"];

let Observable = (target,domain={},{bind,isConstructor,confidence=1,onsubscribe,parent,path=""}={}) => {
    const type= typeof(target);
    if(!target || (type!=="object" && type!=="function")) return target;
    if(target.__observableuid__) return target;
    let bindings = []; // arguments that have satisfied the function
    const ctor = Object.getPrototypeOf(target).constructor,
        dependents = {}, // dependent objects by key that can change
        observers = {},
        listeners = {},
        childObservables = {},
        conditions = new Map(), // objects as keys, map of properties and values accessed as values, only valid during bound execution
        ctors = Object.entries(domain), // the domain of arguments for a function
        continues = new Set(), // actions to invoke when an observable object changes or an observable function is satisfied
        whens = new Map(),
        routes = [],
        local = {
            __observableuid__: uid(),
            confidence,
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
            /*retract({source}={}) {
                let result;
                if(type==="object") {
                    const event = new ObservableEvent({type:"retract",target:proxy,source});
                    local.handleEvent(event);
                    if(!event.defaultPrevented) {
                        if(trace.retract) console.log("Observable:retract",target)
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
            then(f,{confidence=1,threshold=0}={}) {
                if(f.toString().includes("[native code]")) { // happens when Javascript engine treats reactor as a Promise
                    f(()=>proxy);
                    return proxy;
                }
                const thenconfidence = confidence;
                continues.add({
                    f:function(arg,{error,conditions,confidence=1}) {
                        if(confidence>=threshold) {
                            if(error && typeof(error)==="object" && error instanceof Error) { throw error; }
                            confidence = confidence*thenconfidence*confidence;
                            return f.call(this,arg,{conditions,confidence})
                        }
                    }
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
            },*/
            route(...args) {
                routes.push(args);
                return proxy;
            },
            pipe(...args) {
                if(routes.length>0) throw new Error(`Observable already has ${routes.length} routes. Can't also be a pipe`);
                routes.push(args);
                routes.isPipe = true;
                Object.freeze(routes);
                return proxy;
            },
            addEventListener(eventName,listener,{count= Infinity}={}) {
                if(!(eventName in eventTypes)) throw new TypeError(`Invalid event name: ${eventName}`);
                (listeners[eventName] ||= new Map()).set(listener,{listener,options:{count}});
                if(target.addEventListener) target.addEventListener(eventName,(event) => this.dispatchEvent(event));
                return proxy;
            },
            subscribe(listener,eventName="*",{count = Infinity}={}) {
                local.addEventListener(eventName,listener,{count});
                if(onsubscribe) onsubscribe.call(proxy,proxy);
                return proxy;
            },
            hasEventListener(eventName,listener) {
                if(!(eventName in eventTypes)) throw new TypeError(`Invalid event name: ${eventName}`);
                if(!(eventName in eventTypes)) throw new TypeError(`Invalid event name: ${eventName}`);
                return [...(listeners[eventName] ||= new Map()).keys()].some((key) => {
                    return listener===key || listener.name===key.name || listener===key.name || listener+""===key+"";
                })
            },
            hasSubscription(...args) {
                return local.hasEventListener(...args);
            },
            postMessage(eventName,options={}) {
                if(!(eventName in eventTypes)) throw new TypeError(`Invalid event name: ${eventName}`);
                local.dispatchEvent(new ObservableEvent({type:eventName,...options}));
            },
            removeEventListener(eventName,listener) {
                if(!(eventName in eventTypes)) throw new TypeError(`Invalid event name: ${eventName}`);
                [...(listeners[eventName] ||= new Map()).keys()].forEach((key) => {
                    if(listener===key || listener.name===key.name || listener===key.name  || listener+""===key+"") listeners[eventName].delete(key);
                })
                return proxy;
            },
            unsubscribe(...args) {
                return local.unsubscribe(...args);
            },
            async dispatchEvent(event) {
                Object.defineProperty(event,"currentTarget",{configurable:true,value:proxy});
                local.provide(event,event.type);
            },
            async provide(value,eventName="*") {
                    let every = true;
                    listeners["*"] ||= new Map();
                    for(const {listener,options} of [...listeners["*"].values(),...(eventName==="*" ? [] : listeners[eventName]?.values()||[])]) {
                        let result = value?.stopPropagation ? value : (Array.isArray(value) ? [...value] : (value && typeof(value)==="object" ? {...value} : value ));
                        if(routes.length>0) {
                            for(const route of routes) {
                                let trynext, childsucceeded;
                                for(let i=0;i<route.length;i++) {
                                    result = await route[i](result);
                                    if(value?.stopImmediate) {
                                        childsucceeded = false;
                                        result = null;
                                        break;
                                    }
                                    if(result===undefined) {
                                        if(routes.isPipe && !trynext) {
                                            trynext = true;
                                            continue;
                                        }
                                        childsucceeded = false;
                                        result = null;
                                        break;
                                    }
                                    if(i===0) childsucceeded = true;
                                }
                                if(childsucceeded) break;
                            }
                        }
                        if(result==null || value?.stopImmediate) {
                            every = false;
                            break;
                        }
                        await listener(result);
                        options.count--;
                        if(options.count<=0) local.removeEventListener(eventName,listener);
                        if(result.stop) break;
                    }
                    if(every && parent && !value?.stop && !value?.stopImmediate) parent.provide(value,eventName);
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
            result = Array.from(continues).reduce(async (result,{f}) => {
                result = await result;
                if (result) {
                    try {
                        if(result.toString()==="()=>proxy") result = result();
                    } catch(e) {

                    }
                    try {
                        result = await f.call(proxy, result, {error,conditions,justification:binding,confidence});
                    } catch (e) {
                        error = e;
                    }
                    if(error && value===undefined) throw error;
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
                if(value && vtype==="object") value = childObservables[property] ||= Observable(value,undefined,{parent:proxy,path:path ? path + "." + property : property}); // only create one reactor
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
                //if(property==="confidence") throw new TypeError(`confidence is a read-only reserved property of watchlight observable data and rules`);
                if(property==="confidence") local.confidence = confidence;
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
                        event = new ObservableEvent({type:"defineProperty",target:proxy,property,value})
                    } else {
                        event = new ObservableEvent({type:"change",target:proxy,property,value,oldValue})
                    }
                    local.dispatchEvent(event);
                    if(!event.defaultPrevented) {
                        if(setprimitive) target = new ctor(value);
                        else target[property] = value;
                        if(childObservables[property]) {
                            childObservables[property] = Observable(value)
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
                    const event = new ObservableEvent({type:"delete",target:proxy,property,oldValue});
                    local.dispatchEvent(event);
                    if(!event.defaultPrevented) {
                        dependents[property]?.forEach((target) => retract(target,{source:proxy}));
                        dependents[property]?.clear();
                        ctor.functions[property]?.forEach((f) => f.with(proxy));
                    }
                }
                return true;
            },
            apply(target, thisArg, [binding,...args]) {
                if(target===_Observable) return target.call(thisArg,binding,...args);
                if(ctors.length===0 && isConstructor) return Observable(new target(binding,...args));
                agenda.stats.tested++;
                CURRENTWHEN = proxy;
                let result = target.call(thisArg,binding,...args);
                CURRENTWHEN = null;
                if(result) {
                    agenda.stats.succeeded++;
                    if(["when","whilst"].includes(target.name)) {
                        const event = new ObservableEvent({type:"fire",target:proxy,thisArg,argumentList:[binding,...args]});
                        local.dispatchEvent(event);
                        if(!event.defaultPrevented) {
                            const cf = confidence>0 ? Object.values(binding).reduce((cf,value) => Math.min(cf,value.confidence===undefined ? 1 : value.confidence),1) * confidence : undefined;
                            result = doThen(result,{binding,confidence:cf,conditions:new Map(conditions)});
                        }
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
                return Observable(new target(...args));
            }
        });
    ctor.functions ||= {};
    if(type==="function") {
        if(ctors.length>0) {
            target.priority = 0;
            /*ctors.forEach(([_,ctor]) => {
                let functions = functionsByClass.get(ctor);
                if(!functions) {
                    functions = new Set();
                    functionsByClass.set(ctor,functions);
                }
                functions.add(proxy)
            });*/
            try { // force execution so dependencies can be determined
                const binding = {};
                ctors.forEach(([key,ctor]) =>binding[key] = Observable(Object.create(ctor.prototype)));
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
const _Observable = Observable;
Observable = Observable(Observable);
const eventTypes = {
        "*": true,
    defineProperty: true,
    change: true,
    delete: true,
    fire: true,
    retract: true,
    subscribe: true
};
Observable.registerEventType = function(eventName) {
    eventTypes[eventName] = true;
}
Observable.unregisterEventType = function(eventName) {
    delete eventTypes[eventName];
}

const observable = (target,{isConstructor,confidence,onsubscribe}={}) => {
    const type = typeof(target);
    if(type==="function") return Observable(target,{},{isConstructor,confidence,onsubscribe});
    if(!target || type!=="object") throw new TypeError(`Can't create observable object from ${typeof(target)} ${target}`);
    return Observable(target,{onsubscribe,confidence});
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
    if(Array.isArray(data)) data.forEach((item) => instance.push(item)) // should this be isArray(instance)
    else Object.assign(instance,data);
    Object.defineProperty(instance,"constructor",{configurable:true,writable:true,value:constructor.prototype.constructor||constructor});
    return constructor.__observableuid__ ? Observable(instance) : instance;
}


const range = (start,end) => {
   return observable(function*() {
        for(let i=start;i<=end;i++) yield i;
        yield;
    },
       {
           onsubscribe: (target) => {
                for (const number of target()) target.provide(number);
           }
    });
}

const from = (arg) => {
    return observable(function*() {
            for(const item of [...arg]) yield item;
            yield;
        },
        {
            onsubscribe: (target) => {
                for (const item of target()) target.provide(item);
            }
        });
}

export {Observable,ObservableEvent,observable,isObservable,range,from,agenda,workingMemory,observer,unobserve,Partial,deepEqual,getFunctionBody} //,functionsByClass