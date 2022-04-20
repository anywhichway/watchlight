import {deepEqual, Observable, observable, ObservableEvent, isObservable, agenda, workingMemory, functionsByClass} from "./watchlight.js";

const run = (options={}) => {
    agenda.trace = {...options.trace||{}};
    agenda.run({...options});
}

const stop = () => {
    agenda.stop();
};

const assert = (target,{source,confidence}={}) => {
    const value = isObservable(target) ? target : observable(target),
        ctor = Object.getPrototypeOf(target).constructor;
    if(confidence) value.withOptions({confidence});
    let wm = workingMemory.get(ctor);
    if(!wm) {
        wm = new Set();
        workingMemory.set(ctor,wm);
    }
    const event = new ObservableEvent({type:"assert",source,target:value});
    Observable.dispatchEvent(event);
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
    return Observable(when,domain,{bind,confidence});
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
                                const event = new ObservableEvent({type:"assert",source:proxy,target:item});
                                onassert(event);
                                if(event.defaultPrevented) return;
                            }
                            return data[i] = assert(item,{source:proxy}).withConditions(conditions).withOptions({confidence});
                        })
                    } else if(data) {
                        if(onassert) {
                            const event = new ObservableEvent({type:"assert",source:proxy,target:data});
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



export {observable,agenda,workingMemory,run, stop, assert,retract,exists,not, when, whilst}