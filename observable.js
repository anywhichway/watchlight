const deepEqual = (a,b,matchType=deepEqual.LEFT, seen=new Set()) => {
    if(matchType===deepEqual.RIGHT) return deepEqual(b,a,deepEqual.LEFT,seen);
    if(matchType===deepEqual.COMMUTATIVE) return deepEqual(a,b,deepEqual.LEFT) && deepEqual(b,a,deepEqual.LEFT);
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
                if(![...b].some((bvalue) => deepEqual(avalue,bvalue,matchType,seen))) return false;
            }
            return true;
        }
        if(a instanceof Map) {
            for(const [key,value] of [...a]) {
                if(!deepEqual(b.get(key),value,matchType,seen)) return false;
            }
            return true;
        }
        for(const key in a) {
            if(!deepEqual(a[key],b[key],matchType,seen)) return false;
        }
        return true;
    }
    return false;
}
deepEqual.LEFT = 1;
deepEqual.COMMUTATIVE = 2;
deepEqual.RIGHT = 3;

const isClass = (value) => {
    return typeof value === 'function' && (
        /^\s*class[^\w]+/.test(value.toString()) ||

        // 1. native classes don't have `class` in their name
        // 2. However, they are globals and start with a capital letter.
        (globalThis[value.name] === value && /^[A-Z]/.test(value.name))
    );
}

let CHANGELISTENER;

const setChangeListener = listener => CHANGELISTENER = listener;

const getChangeListener = () => CHANGELISTENER;

const indexObject = ({instance, indexNodes}, index, data = instance) => {
    [...Object.entries(data)].forEach(([property, value]) => {
        const type = typeof (value);
        if (type === "function") return;
        if (value && type === "object" && [Date, Set, WeakSet, Map, WeakMap, Array].some((ctor) => value instanceof ctor)) {
            return;
        }
        if (type === "string") value = value.substring(0, 32);
        index[property] ||= {};
        index[property][type] ||= {};
        if (type === "object") {
            indexObject({instance, indexNodes}, index[property][type], value)
        } else {
            index[property][type][value] ||= new Set();
            Object.assign(index[property][type][value], {property, type, value});
            indexNodes.add(index[property][type][value]);
            index[property][type][value].add(instance);
        }
    })
}

const _queryInstances = (index, pattern, instances = new Set()) => {
    for (let [key, value] of Object.entries(pattern)) {
        const type = typeof (value);
        if (type === "function") continue;
        if (value && type === "object" && [Date, Set, WeakSet, Map, WeakMap, Array].some((ctor) => value instanceof ctor)) {
            continue;
        }
        if (!index[key] || !index[key][type]) {
            instances.clear();
            return;
        }
        if (type === "string") value = value.substring(0, 32);
        if (type === "object") {
            _queryInstances(index[key][type], value, instances);
        } else {
            if (index[key][type][value] === undefined) {
                instances.clear();
                return;
            }
            if (instances.size === 0 && index[key][type][value].size > 0) {
                const objects = [...index[key][type][value]];
                objects.forEach((instance) => instances.add(instance));
            } else {
                [...instances].forEach((instance) => {
                    if (!index[key][type][value].has(instance)) {
                        instances.delete(instance);
                    }
                });
            }
        }
        if (instances.size === 0) return;
    }
    return instances;
}

class ObservableEvent {
    constructor({type, ...rest}) {
        Object.defineProperty(this, "type", {enumerable: true, value: type});
        Object.defineProperty(this, "timestamp", {enumerable: true, value: Date.now()});
        Object.defineProperty(this, "bubbles", {
            enumerable: true,
            value: typeof (rest.bubbles) === "boolean" ? rest.bubbles : true
        });
        Object.defineProperty(this, "cancelable", {
            enumerable: true,
            value: typeof (rest.cancelable) === "boolean" ? rest.cancelable : true
        });
        Object.defineProperty(this, "defaultPrevented", {enumerable: true, configurable: true, value: false});
        Object.defineProperty(this, "stop", {enumerable: true, configurable: true, value: false});
        Object.defineProperty(this, "stopImmediate", {enumerable: true, configurable: true, value: false});
        Object.entries(rest).forEach(([key, value]) => {
            if (value !== undefined) Object.defineProperty(this, key, {
                enumerable: true,
                writable: true,
                configurable: true,
                value
            });
        })
        if (this.target) Object.defineProperty(this, "currentTarget", {
            enumerable: true,
            configurable: true,
            value: this.target
        });
    }

    preventDefault() {
        if (!this.cancelable) throw new TypeError(`This ObservableEvent is not a cancelable event`)
        Object.defineProperty(this, "defaultPrevented", {value: true});
    }

    stopPropagation() {
        Object.defineProperty(this, "stop", {value: true});
    }

    stopImmediatePropagation() {
        Object.defineProperty(this, "stopImmediate", {value: true});
    }
}

const eventTypes = {
    "*": true,
    defineProperty: true,
    change: true,
    delete: true,
    subscribe: true
};
const registeredEventTypes = {...eventTypes};

function Observable(target = {}, {noClone, global, observeInstances, trackInstances, partials, withConfidence} = {}) {
    const type = typeof (target);
    if (target.watchlight && (type !== "function" || target.name === target.watchlight.proxy.name)) {
        return noClone ? target : clone(target);
    }
    const proxy = observableProxy(target, {observeInstances, trackInstances, partials,withConfidence});
    if (type === "function" && target.name && (globalThis[target.name] || global)) { // happens for classes, others return string rep of function
        globalThis[target.name] = proxy;
    }
    return proxy;
}
Observable.registerEventType = function(eventName) {
    eventTypes[eventName] = true;
}
Observable.unregisterEventType = function(eventName) {
    delete eventTypes[eventName];
}

const observable = (...targets) => {
    if (targets.length > 1) return targets.map((target) => Observable(target));
    return Observable(targets[0]);
}

const observableProxy = (target, {
    observeInstances,
    trackInstances,
    trackedIndex,
    dependentInstances,
    withConfidence,
    confidence,
    queryInstances,
    indexNodes,
    partials,
    listeners = {"*": new Set()},
    routes = [],
    parents = new Set(),
    onsubscribe = () => Object.create(null),
    unsubscribe = () => {},
    changeListeners = Object.create(null)
} = {}) => {
    const watchlight = {
        target: Array.isArray(target) ? [] : {},
        observeInstances,
        trackInstances,
        trackedIndex,
        queryInstances,
        indexNodes,
        dependentInstances: new Set(),
        withConfidence,
        confidence: 1,
        partials,
        listeners: {...listeners},
        routes: [...routes],
        parents: new Set([...parents]),
        onsubscribe,
        unsubscribe,
        changeListeners: {...changeListeners}
    }
    watchlight.routes.isPipe = routes.isPipe;
    const {proxy,revoke} = Proxy.revocable(target, {
        get(target, property) {
            if(property==="toJSON") {
                return function toJSON() {
                    const json = target.toJSON ? target.toJSON() : target;
                    if(json && typeof(json)==="object" && withConfidence) json.confidence = watchlight.confidence;
                    return json;
                }
            }
            if (property === "target") return target;
            if (property === "watchlight") return watchlight;
            if (property === "addEventListener") return addEventListener.bind(proxy); // && target.addEventListener
            if (property === "hasEventListener") return hasEventListener.bind(proxy); // && target.addEventListener
            if (property === "removeEventListener" ) return removeEventListener.bind(proxy); //&& target.removeEventListener
            if (property === "dispatchEvent") return dispatchEvent.bind(proxy);
            if (property === "postMessage") return postMessage.bind(proxy);
            if(property === "publish") return (...items) => items.forEach((item) => publish(item,proxy));
            if (property === "pipe") return (...functions) => pipe(functions, proxy);
            if (property === "route") return (...functions) => route(functions, proxy);
            if (property === "split") return (...objects) => split(proxy, ...objects);
            if (property === "subscribe") return (listener,complete,error) => {
                return complete||error ? subscribe({next:listener,complete,error}, proxy) : subscribe(listener, proxy);
            }
            if (property === "unsubscribe") return (listener) => { unsubscribe(listener, proxy); watchlight.unsubscribe(); revoke(); if(target.unsubscribe) target.unsubscribe() }
            if(property === "withOptions") return withOptions.bind(proxy);
            if(property === "confidence") return watchlight.confidence;
            if (watchlight.observeInstances && watchlight.trackInstances) {
                if (property === "stopTracking") {
                    return () => {
                        const map = [...watchlight.indexNodes || []].map((node) => node.delete(proxy))
                        delete watchlight.indexNodes;
                        return map.length > 0;
                    }
                }
                if (property === "isTracked") return () => !!watchlight.indexNodes;
            }
            let value = target[property];
            if (typeof (target) !== "function" && value && typeof (value) === "object") {
                if (!value.watchlight) {
                    value = target[property] = Observable(value);
                }
                value.watchlight.parents.add(proxy);
            }
            if (CHANGELISTENER && typeof (value) !== "function") {
                const listeners = watchlight.changeListeners[property] ||= new Set(),
                    watches = CHANGELISTENER.watches ||= new Map();
                let properties = watches.get(proxy.constructor);
                if (!properties) {
                    properties = {};
                    watches.set(proxy.constructor, properties);
                }
                properties[property] = true;
                listeners.add(CHANGELISTENER);
            }
            return value;
        },
        set(target, property, value) {
            if(property==="confidence") {
                watchlight.confidence = value;
                return true;
            }
            const oldValue = target[property];
            if (oldValue !== value) {
                target[property] = value;
                let canceled;
                if (oldValue === undefined) {
                    let event = new ObservableEvent({type: "defineProperty", target: proxy, property, value})
                    dispatchEvent.call(proxy, event);
                    canceled ||= event.defaultPrevented;
                    [...watchlight.changeListeners[property] || []].forEach((listener) => {
                        event = new ObservableEvent({type: "defineProperty", target: proxy, property, value});
                        listener(event);
                        canceled ||= event.defaultPrevented;
                    })
                } else {
                    let event = new ObservableEvent({type: "change", target: proxy, property, value, oldValue});
                    dispatchEvent.call(proxy, event);
                    canceled ||= event.defaultPrevented;
                    [...watchlight.changeListeners[property] || []].forEach((listener) => {
                        event = new ObservableEvent({type: "change", target: proxy, property, value, oldValue});
                        listener(event);
                    })
                    canceled ||= event.defaultPrevented;
                }
                if (canceled) return false;
                // reindex, to do add recursive objects, separate function
                if (watchlight.trackInstances) {
                    const trackedIndex = watchlight.trackedIndex,
                        indexNodes = watchlight.indexNodes,
                        instance = proxy;
                    [...indexNodes].some((node) => {
                        if (node.property === property && node.type === typeof (oldType) && node.value === oldValue) {
                            node.delete(instance);
                            indexObject({instance, indexNodes}, trackedIndex);
                        }
                    })
                }
                if (value && typeof (value) === "object") {
                    if (!value.watchlight) value = Observable(value);
                    target[property] = value;
                    value.watchlight.parents.add(target);
                }
            }
            return true;
        },
        deleteProperty(target, property) {
            const oldValue = target[property];
            if (oldValue !== undefined) {
                let canceled,
                    event = new ObservableEvent({type: "delete", target: proxy, property, oldValue})
                dispatchEvent.call(proxy, event);
                canceled ||= event.defaultPrevented;
                [...watchlight.changeListeners[property] || []].forEach((listener) => {
                    event = new ObservableEvent({type: "delete", target: proxy, property, oldValue});
                    listener(event);
                    canceled ||= event.defaultPrevented;
                })
                if (canceled) return false;
                // reindex, to do add recursive objects, separate function
                if (watchlight.trackInstances) {
                    const trackedIndex = watchlight.trackedIndex,
                        indexNodes = watchlight.indexNodes,
                        instance = proxy;
                    [...indexNodes].some((node) => {
                        if (node.property === property && node.type === typeof (oldValue) && node.value === oldValue) {
                            node.delete(instance);
                        }
                    })
                }
            }
            return true;
        },
        apply(target, thisArg, argsList) {
            let value;
            try {
                value = target.call(thisArg, ...argsList);
            } catch (e) {
                // creates a Partial
                if (watchlight.partials && e instanceof TypeError && e.message.includes("'new'")) {
                    value = Object.create(target.prototype);
                    if (value instanceof Array) {
                        Object.assign(value, argsList);
                    } else {
                        Object.assign(value, ...argsList);
                    }
                    Object.defineProperty(value, "constructor", {
                        enumerable: false,
                        configurable: true,
                        writbale: true,
                        value: proxy
                    });
                } else {
                    throw e;
                }
            }
            return value;
        },
        construct(target, argumentList, newTarget) {
            let instance = Reflect.construct(target, argumentList, newTarget);
            Object.defineProperty(instance, "constructor", {
                enumerable: false,
                configurable: true,
                writbale: true,
                value: proxy
            });
            if (watchlight.observeInstances) {
                instance = observableProxy(instance, watchlight);
                if (watchlight.trackInstances) {
                    const tracker = {instance, indexNodes: new Set()};
                    const index = watchlight.trackedIndex ||= {};
                    indexObject(tracker, index);
                    instance.watchlight.indexNodes = tracker.indexNodes;
                    watchlight.queryInstances = _queryInstances.bind(watchlight, index);
                }
            }
            publish({target: instance}, proxy);
            return instance;
        }
    })
    watchlight.proxy = proxy;
    return proxy;
}

const withOptions = function({confidence}) {
    this.watchlight.confidence = parseFloat(confidence);
}

const addEventListener = function (eventType, listener) {
    if (!(eventType in eventTypes)) throw new TypeError(`Invalid event name: ${eventType}`);
    return subscribe({next:listener, eventType, noClone:true}, this);
};

const clone = (observable) => observableProxy(observable.target, observable.watchlight);

const observer = (f,thisArg,...args) => {
    let observer, errors = (e) => { throw(e) };
    if(Object.getPrototypeOf(f)===Object.getPrototypeOf(async ()=>{})) {
        observer = async function(...args) {
            if (CHANGELISTENER !== observer  && !observer.stopped) {
                let result;
                CHANGELISTENER = observer;
                try {
                    result = await f.call(this, ...args);
                } catch (e) {
                    result = errors(e);
                }
                CHANGELISTENER = null;
                return result;
            }
        }
        if (f.name) observer = AsyncFunction(`return async function ${f.name}(...args) { return (${observer}).call(this,...args) }`)();
    } else {
        observer = function (...args) {
            if (CHANGELISTENER !== observer && !observer.stopped) {
                let result;
                CHANGELISTENER = observer;
                try {
                    result = f.call(this, ...args);
                } catch(e) {
                    result = errors(e);
                }
                CHANGELISTENER = null;
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
            const current = CHANGELISTENER;
            CHANGELISTENER = null;
            const result = await f(...args);
            CHANGELISTENER = current;
            return result;
        }
        return unobserver();
    }
    function unobserver(...args) {
        const current = CHANGELISTENER;
        CHANGELISTENER = null;
        const result = f(...args);
        CHANGELISTENER = current;
        return result;
    }
    return unobserver();
}


const postMessage = async function(eventName,options={}) {
    if(!(eventName in eventTypes)) throw new TypeError(`Invalid event name: ${eventName}`);
    return this.dispatchEvent(new ObservableEvent({type:eventName,...options}));
};

const dispatchEvent = function async (event) {
    Object.defineProperty(event, "currentTarget", {configurable: true, value: this});
    return publish(event, this);
};

const from = (arg) => {
    const observable = Observable(function* () {
        for (const item of [...arg]) {
            yield item;
        }
        yield undefined;
    });
    return observable;
}

const fromEvent = (eventName,...eventEmitters) => {
    if(eventEmitters.length>1) return eventEmitters.map((eventEmitter) => fromEvent(eventName,eventEmitter));
    const observable = Observable(eventEmitters[0]);
    eventEmitters[0].addEventListener(eventName,(event) => {
        publish(event,observable);
    });
    return observable;
}


const merge = (...observables) => {
    const o = Observable(),
        completed = [];
    observables.forEach((observable) => {
        observable.subscribe({
            next(value) {
                publish(value,o);
            },
            complete() {
                completed.push(observable);
                if(completed.length===observables.length) {
                    [...o.watchlight.listeners["*"]].forEach((listener) => {
                        if(listener.complete) listener.complete();
                        Object.defineProperty(listener,"completed",{enumerable:false,configurable:false,writable:false,value:true});
                    })
                }
            }
        })
    })
    return o;
}

const of = (...args) => from(args);

const partition = (observable,predicate) => {
    const o1 = Observable(),
        o2 = Observable();
    observable.subscribe({
        next(value) {
            if(predicate(value)) publish(value,o1)
            else publish(value,o2);
        },
        complete() {
            [o1,o2].forEach((observable) => {
                [...observable.watchlight.listeners["*"]].forEach((listener) => {
                    if(listener.complete) listener.complete();
                    Object.defineProperty(listener,"completed",{enumerable:false,configurable:false,writable:false,value:true});
                })
            })
        }
    })
    return [o1, o2];
}

const pipe = (functions, ...observables) => {
    if (observables.length > 1) return observables.map((observable) => pipe(functions, observables));
    const observable = Observable(observables[0],{noClone:true}),
        watchlight = observable.watchlight;
   if (watchlight.routes.isPipe) {
       watchlight.routes[0].push(...functions);
   } else {
        watchlight.routes.push(functions);
        watchlight.routes.isPipe = true;
        Object.freeze(watchlight.routes);
   }
    return observable;
};

const publish = async (item, ...observables) => {
    if(observables.length>1) return observables.map((observable) => publish(item,observable));
    const observable = observables[0],
        watchlight = observable.watchlight,
        routes = watchlight?.routes || [];
    if(!watchlight) return; // occurs is sheet, not sure why
    let result = await item,
        listeners = [...watchlight.listeners["*"]||[]],
        isevent;
    if(item && typeof(item)==="object" && (item instanceof Event || item instanceof ObservableEvent)) {
        listeners.push(...watchlight.listeners[item.type]||[]);
        isevent = true;
    }
    if (routes.length > 0) {
        for (let i=0; i<routes.length; i++) {
            const route = routes[i];
            let trynext, childsucceeded, previous;
            for (let j = 0; j < route.length; j++) {
                result = await route[j](result,observable);
                if (item?.stopImmediate) {
                    childsucceeded = false;
                    result = null;
                    break;
                }
                if (result === undefined) {
                    if(!routes.isPipe) {
                        if(i<routes.length-1) result = item;
                        break;
                    } else if (!trynext) {
                        trynext = true;
                        continue;
                    }
                    childsucceeded = false;
                    break;
                }
                if (j === 0) childsucceeded = true;
            }
            if (childsucceeded) break;
        }
    }
    if(result!==undefined && (!isevent || (item && !item.stop && !item.stopImmediate))) {
        listeners.every(async (listener) => {
            if(result && typeof(result)==="object" && result instanceof Error) {
                if (listener.error) listener.error(result);
                else throw result;
            } else {
                try {
                    await listener.next(result);
                } catch (e) {
                    if (listener.error) listener.error(e);
                    else throw e;
                }
            }
        });
        if(!isevent || (!item.stop && !item.stopImmediate)) {
            [...observable.watchlight.parents||[]].every(async (parent) => {
                await publish(item,parent);
                return !isevent || !item.stopImmediate
            })
        }
    }
}

const range = (start, end=start) => {
    const observable = Observable(function* () {
        for (let i = start; i <= end; i++) yield i;
        yield;
    });
    return observable;
}

const registerEventTypes = (...types) => {
    types.forEach((type) => eventTypes[type] = true)
    Object.assign(registeredEventTypes, eventTypes); // exposes a copy for export
}


const route = (functions, ...objects) => {
    if (objects.length > 1) return objects.map((object) => route(functions, object));
    functions = functions.map((f) => {
        const type = typeof(f);
        if(type==="function") return f;
        if(f && type==="object") {
            if (f instanceof RegExp) return (value) => f.test(value) ? value : undefined;
            return (value) => deepEqual(value,f,deepEqual.COMMUTATIVE) ? value : undefined
        }
        if(["boolean","number","string"].includes(type)) return (value) => value===f ? value : undefined;
        return f;
    })
    const observable = Observable(objects[0]);
    observable.watchlight.routes.push(functions);
    return observable;
};

const split = (object, ...objects) => {
    objects = subscribe(null, ...objects);
    object.subscribe((value) => objects.forEach((object) => publish(value, object)));
    return objects;
}

const subscribe = (listener, ...observables) => {
    if (observables.length > 1) return observables.map((object) => subscribe(listener, object));
    let eventType = "*", noClone, type = typeof (listener), observable = observables[0];
    if(type==="function") {
        listener = {
            next: listener
        }
    } else if(type==="string") { // deprecate?
        eventType = listener;
        listener = {
            next: (value) => value
        }
    }
    type = typeof (listener);
    if(!listener || type!=="object" || typeof(listener.next)!=="function") throw new TypeError(`A subscriber must be a function, string, or object supporting next(value) not ${type}`)
    if(!listener.noClone || !observable.watchlight) observable = Observable(observable);
    if(listener.eventType) eventType = listener.eventType;
    const otype = typeof(observable),
        watchlight = observable.watchlight,
        listeners = watchlight.listeners[eventType] ||= new Set();
    listeners.add(listener);
    if (observable.target.addEventListener) {
        const handler = (event) => {
            publish(event,observable);
        }
        observable.target.addEventListener(eventType, handler);
        // todo if doc disconnect, unsubscribe
        observable.watchlight.unsubscribe = () => observable.target.removeEventListener(handler);
    } else if(Object.getPrototypeOf(observable)===Object.getPrototypeOf(function*(){})) {
        let unsubscribe;
        setTimeout(async () => {
            for (const item of observable()) {
                if (unsubscribe) return;
                await publish(item, observable);
            }
            if(listener.complete) listener.complete();
            Object.defineProperty(listener,"completed",{enumerable:false,configurable:false,writable:false,value:true});
        });
        observable.watchlight.unsubscribe = () => unsubscribe = true;
    } else if(otype==="function" && !isClass(observable)) {
        observable.watchlight.unsubscribe = observable(listener);
    } else if(observable && (otype=="object" || otype==="function")) {
        const {proxy,revoke} = Proxy.revocable(observable,{
            set(target,property,value) {
                const oldValue = target[property];
                if(value!==oldValue) {
                    if(oldValue===undefined) {
                        if(eventType==="*" || eventType==="defineProperty") {
                            const event = new ObservableEvent({type:"defineProperty",target:observable,property,value});
                            publish(event,observable).then(() => {
                                if(!event.preventDefault) {
                                    target[property] = value;
                                }
                            });
                        }
                    } else {
                        if(eventType==="*" || eventType==="change") {
                            const event = new ObservableEvent({type:"change",target:observable,property,value,oldValue})
                            publish(event,observable).then(() => {
                                if(!event.preventDefault) {
                                    target[property] = value;
                                }
                            });
                        }
                    }
                }
                return true;
            }
        });
        observable = proxy;
        observable.watchlight.unsubscribe = () => revoke();
    } else {
        throw new TypeError(`Observable must be an object or a function not ${typeof(otype)}`)
    }
    return observable;
};

const timestamp = (clock=Date) => {
    return (value) => {
        if(value!==undefined) return {value,timestamp:clock.now()}
    }
}

const unregisterEventTypes = (...types) => {
    types.forEach((type) => {
        delete eventTypes[type];
        delete registeredEventTypes[type];
    })
}

const unsubscribe = (listener, ...observerables) => {
    if (observerables.length > 1) return observerables.map((observerable) => unsubscribe(listener,observerable));
    const observerable = observerables[0],
        type = typeof(listener);
    if(!observable.watchlight) return;
    if(type==="string") {
        const eventType = listener;
        if(observable.watchlight.listeners[eventType]) {
            observable.watchlight.listeners[eventType] = new Set();
        }
        return;
    }
    if(type==="function" && listener.name) {
        const eventType = listener.name;
        const next = listener;
        [...observable.watchlight.listeners[eventType]||[]].forEach((listener) => {
            if(listener.next===next) observable.watchlight.listeners[eventType].delete(listener);
        })
        return;
    }
    if(listener.next.name) {
        const eventType = listener.name,
            todelete = listener;
        [...observable.watchlight.listeners[eventType]||[]].forEach((listener) => {
            if(listener===todelete) observable.watchlight.listeners[eventType].delete(listener);
        })
        return;
    }
    return observable
};

const zip = (...observables) => {
    const o = Observable(),
        subscriptions = [],
        values = [];
    for(let i=0;i<observables.length;i++) {
        const observable = observables[i];
        let count = 0,
            maxcount= Infinity;
        subscriptions.push(observable.subscribe({
            next(value) {
                values[count] ||= [];
                values[count][i] = value;
                if (values[count].length===observables.length && values[count].every((item) => item !== undefined)) {
                    publish(values[count], o);
                }
                count++;
                if(count>=maxcount) {
                    subscriptions[i].unsubscribe();
                    subscriptions[i] = null;
                }
            },
            complete() {
                if(maxcount===Infinity) maxcount = count;
                subscriptions[i] = null;
                if(subscriptions.every((item) => item===null)) {
                    [...o.watchlight.listeners["*"]].forEach((listener) => {
                        if(listener.complete) listener.complete();
                        Object.defineProperty(listener,"completed",{enumerable:false,configurable:false,writable:false,value:true});
                    })
                }
            }
        }))
    }
    return o;
}

const asapScheduler = (delay = 0,clock=Date) => {
    const start = clock.now(),
        wait = async () => {
            return new Promise((resolve) => {
                if(clock.now()>=start + (typeof(delay)==="number" ? delay : delay.getTime())) resolve(true)
                else resolve(false);
            })
        }
    return async (value) => {
        return new Promise(async (resolve) => {
            let done = wait();
            while(!await done) {
                done = wait();
            }
            resolve(value)
        })
    }
}

const asyncScheduler = (delay= 0,clock=Date) => {
    return async (value) => {
        return new Promise((resolve) => {
            if(typeof(delay)==="number") {
                setTimeout(() => resolve(value), delay);
            }
            else if(delay && typeof(delay)==="object") {
                setTimeout(()=> resolve(value),delay.getTime() - clock.now());
            }
        })
    }
}

const animationFrameScheduler = (delay= 0) => {
    const start = Date.now(),
        wait = async () => {
            return new Promise((resolve) => {
                if(Date.now()>=start + delay) resolve(true)
                else resolve(false);
            })
        }
    return async (value) => {
        let done = wait();
        const type = typeof(value);
        while(!await done) {
            done = wait();
        }
        if(type!=="function") throw new TypeError("animationFrameScheduler can only be used with functions not ${type} ${value}")
        requestAnimationFrame(value);
        return;
    }
}

const observeOn = (scheduler,delay) => {
    return scheduler(delay);
}

class Clock {
    constructor({initialTime=Date.now(),speed=1,run}={}) {
        this.initialTime = initialTime;
        this.speed = speed;
        if(!run) this.stopped  = this.initialTime;
    }
    getTime() {
        return now();
    }
    now() {
        const realtime = Date.now(),
            expired = (this.stopped || Date.now()) - this.initialTime;
        return this.initialTime + (expired * this.speed);
    }
    reset(toTime) {
        this.initialTime = toTime || Date.now();
        if(this.stopped) this.stopped = this.initialTime;
    }
    start() {
        this.stopped = 0;
    }
    stop() {
        this.stopped = Date.now();
    }
}


export {
    asapScheduler,
    asyncScheduler,
    animationFrameScheduler,
    Clock,
    deepEqual,
    from,
    fromEvent,
    merge,
    Observable,
    observable,
    observeOn,
    observer,
    of,
    partition,
    pipe,
    publish,
    range,
    registerEventTypes,
    registeredEventTypes,
    route,
    split,
    subscribe,
    timestamp,
    unobserve,
    unsubscribe,
    zip,
    unregisterEventTypes,
    getChangeListener,
    setChangeListener
}
