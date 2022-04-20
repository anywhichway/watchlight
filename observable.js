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

function Observable(target = {}, {noClone, global, observeInstances, trackInstances, partials} = {}) {
    const type = typeof (target);
    if (target.watchlight && (type !== "function" || target.name === target.watchlight.proxy.name)) {
        return noClone ? target : clone(target);
    }
    const proxy = observableProxy(target, {observeInstances, trackInstances, partials});
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
    confidence,
    queryInstances,
    indexNodes,
    partials,
    listeners = {"*": new Map()},
    routes = [],
    parents = new Set(),
    onsubscribe = () => Object.create(null),
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
        confidence: 1,
        partials,
        listeners: {...listeners},
        routes: [...routes],
        parents: new Set([...parents]),
        onsubscribe,
        changeListeners: {...changeListeners}
    }
    const proxy = new Proxy(target, {
        get(target, property) {
            if(property==="toJSON") {
                return function toJSON() {
                    const json = target.toJSON ? target.toJSON() : target;
                    if(json && typeof(json)==="object") json.confidence = watchlight.confidence;
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
            if (property === "pipe") return (...functions) => pipe(functions, proxy);
            if (property === "route") return (...functions) => route(functions, proxy);
            if (property === "split") return (...objects) => split(proxy, ...objects);
            if (property === "subscribe") return (listener) => subscribe(listener, proxy);
            if (property === "unsubscribe") return (listener) => unsubscribe(listener, proxy);
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
            let value,
                canceled,
                event = new ObservableEvent({type: "apply", target: proxy, thisArg, argsList:[...argsList]});
            dispatchEvent.call(proxy, event);
            canceled ||= event.defaultPrevented;
            if (canceled) return undefined;
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
            provide({target: instance}, proxy);
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
    return subscribe({listener, eventType, noClone:true}, this);
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

const dispatchEvent = async function (event) {
    Object.defineProperty(event, "currentTarget", {configurable: true, value: this});
    return provide(event, this);
};

const from = (arg) => {
    const observable = Observable(function* () {
        for (const item of [...arg]) yield item;
        yield;
    });
    observable.watchlight.onsubscribe = (target) => {
        for (const item of target()) provide(item, target);
    }
    return observable;
}

const fromAsync = (arg) => {
    const observable = Observable(function* () {
        for (const item of [...arg]) yield item;
        yield;
    });
    observable.watchlight.onsubscribe = async (target) => {
        for (const item of target()) await provide(await item, target);
    }
    return observable;
}

const merge = (...objects) => {
    const observable = Observable();
    subscribe({listener: (value) => provide(value, observable), noClone: true}, ...objects);
    return observable;
}

const of = (...args) => from(args);

const ofAsync = (...args) => fromAsync(args);

const pipe = (functions, ...objects) => {
    if (objects.length > 1) return objects.map((object) => pipe(functions, object));
    const observable = Observable(objects[0]),
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

const provide = async (eventOrValue, ...objects) => {
    if (objects.length > 1) return objects.map((object) => provide(eventOrValue, object));
    const observable = objects[0];
    if (!observable.watchlight) return; // should not happen, bug elseweher in code
    let eventType = "*",
        bubbles;
    if (eventOrValue && typeof (eventOrValue) === "object") {
        if (eventOrValue instanceof Event || eventOrValue instanceof ObservableEvent) {
            eventType = eventOrValue.type;
            bubbles = eventOrValue.bubbles;
        }
    }
    let every = true;
    const {listeners, routes, parents} = observable.watchlight,
        nongenericevents = ["subscribe", "unsubscribe","apply"];
    let result = eventOrValue;
    if (routes.length > 0) {
        for (let i=0; i<routes.length; i++) {
            const route = routes[i];
            let trynext, childsucceeded;
            for (let j = 0; j < route.length; j++) {
                result = await route[j](result);
                if (eventOrValue?.stopImmediate) {
                    childsucceeded = false;
                    result = null;
                    break;
                }
                if (result === undefined) {
                    if(!routes.isPipe) {
                        if(i<routes.length-1) result = eventOrValue;
                        break;
                    } else if (!trynext) {
                        trynext = true;
                        continue;
                    }
                    childsucceeded = false;
                    result = null;
                    break;
                }
                if (j === 0) childsucceeded = true;
            }
            if (childsucceeded) break;
        }
    }
    for (const [listener, options] of [...(nongenericevents.includes(eventType) ? [] : listeners["*"]), ...(eventType === "*" ? [] : listeners[eventType] || [])]) {
        if (result == null || eventOrValue?.stopImmediate) {
            every = false;
            break;
        }
        if (Object.getPrototypeOf(result) === Object.getPrototypeOf(function* () {
        })) {
            for (const item of result()) {
                await listener(item);
            }
        } else {
            await listener(result);
        }
        options.count--;
        if (options.count <= 0) local.unsubscribe(listener, eventType);
        if (result.stop) break;
    }
    if (every && bubbles && !eventOrValue?.stop && !eventOrValue?.stopImmediate) [...parents].forEach((parent) => provide(eventOrValue, parent));
};

const range = (start, end) => {
    const observable = Observable(function* () {
        for (let i = start; i <= end; i++) yield i;
        yield;
    });
    observable.watchlight.onsubscribe = async (target) => {
        for (const number of target()) provide(number, target);
    }
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
    object.subscribe((value) => objects.forEach((object) => provide(value, object)));
    return objects;
}

const subscribe = (listener, ...objects) => {
    if (objects.length > 1) return objects.map((object) => subscribe(listener, object));
    let eventType = "*", noClone;
    const type = typeof (listener);
    if (listener && type === "object") {
        eventType = listener.eventType ? listener.eventType : eventType;
        noClone = listener.noClone;
        listener = listener.listener;
    } else if (type === "string") {
        eventType = listener;
        listener = () => {
        };
    } else if (type === "function" && listener.name) {
        eventType = listener.name;
    }
    const observable = noClone ? objects[0] : Observable(objects[0]),
        watchlight = observable.watchlight,
        listeners = eventType ? watchlight.listeners[eventType] ||= new Map() : null;
    if (listener && listeners) listeners.set(listener, {});
    if (observable.target.addEventListener) {
        observable.target.addEventListener(eventType, (event) => dispatchEvent.call(observable, event));
    }
    if (watchlight.onsubscribe) watchlight.onsubscribe(observable);
    return observable;
};

const unregisterEventTypes = (...types) => {
    types.forEach((type) => {
        delete eventTypes[type];
        delete registeredEventTypes[type];
    })
}

const unsubscribe = (listener, ...objects) => {
    if (objects.length > 1) return objects.map((object) => unsubscribe(listener, eventType, {asString}, object));
    let eventType = "*",
        asString = false;
    if (listener && typeof (listener) === "object") {
        eventType = listener.eventType;
        asString = listener.asString;
        listener = listener.listener;
    }
    const observable = objects[0],
        watchlight = observable.watchlight,
        listeners = [...watchlight.listeners[eventType] || []];
    listeners.some(([listener]) => {
        if (asString) {
            if (subscription + "" === listener + "") watchlight.listeners[eventType].delete(listener);
            return false;
        }
        if (subscription === listener) {
            watchlight.listeners[eventType].delete(listener);
            return true;
        }
    })
    return observable
};


export {
    deepEqual,
    from,
    merge,
    observable,
    observer,
    of,
    pipe,
    provide,
    range,
    registerEventTypes,
    registeredEventTypes,
    route,
    split,
    subscribe,
    unobserve,
    unsubscribe,
    unregisterEventTypes,
    Observable,
    getChangeListener,
    setChangeListener
}
