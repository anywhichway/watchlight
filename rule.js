import {setChangeListener,getChangeListener,Observable} from "./observable.js";

function* cartesian(head, ...tail) {
    const remainder = tail.length > 0 ? cartesian(...tail) : [[]];
    for (let r of remainder) for (let h of head) yield [h, ...r];
}
const exists = (partial,test) => {
    const listener = getChangeListener(),
        result = partial.constructor.watchlight?.queryInstances?.(partial);
    setChangeListener(listener);
    return !!result;
}
const not = (partial,test) => {
    return !exists(partial,test);
}

class Agenda {
    constructor() {
        this.queue = [];
        this.resetStats();
    }
    resetStats() {
        this.stats = {
            tested:0,
            succeeded:0,
            resets: 0,
            testTime: 0,
            actionTime: 0,
            matchTime: 0,
            resetTime: 0
        }
    }
    getStats() {
        const stats = {...this.stats};
        stats.start = stats.start / 1000;
        stats.end = stats.end / 1000;
        stats.runTime = (stats.end - stats.start);
        stats.testTime = stats.testTime / 1000;
        stats.actionTime = stats.actionTime / 1000;
        stats.matchTime = stats.matchTime / 1000;
        stats.resetTime = stats.resetTime / 1000;
        stats.rps = stats.tested /  stats.runTime;
        stats.efficiency = stats.actionTime / stats.testTime;
        return stats;
    }
    push(priority,item) {
        this.queue[priority] ||= [];
        this.queue[priority].push(item);
        if(this.reset) this.reset();
    }
    shift(priority,item) {
        return this.queue[priority].shift();
    }
    run() {
        if(!RUN) return;
        const stats = this.stats;
        if(!stats.start) stats.start = performance.now();
        if(!stats.end) stats.end = performance.now();
        stats.resetTime = performance.now() - stats.end;
            let tested = 0,
                succeeded = 0,
                stop = false;
            this.reset = () => {
                stats.resets++;
                stop = true;
                //resolve({reset:true,tested,succeeded});
            }
            for (let i=this.queue.length-1;i>=0;i--) {
                const prioritygroup = this.queue[i];
                if (prioritygroup && prioritygroup.length>0) {
                    let rule;
                    while (rule = prioritygroup.shift()) {
                        stats.tested++;
                        const result = rule();
                        if(result) {
                            const {testTime,actionTime} = result;
                            stats.testTime += testTime;
                            stats.actionTime += actionTime;
                            stats.succeeded++;
                        }
                        if (stop) {
                            stop = false;
                            break;
                        }
                    }
                }
            }
            this.reset = null;
            stats.end = performance.now();
    }
}
const agenda = new Agenda();

const getStats = () => agenda.getStats();

const resetStats = () => agenda.resetStats();

let RUN = false;
//const run = (state) => RUN = state;
const run = () => {
    RUN = true;
    agenda.run();
}

const when = (test,domain={},{priority = 0}={}) => {
    const bindings = {},
        varnames = [],
        ctors = new Set(),
        domains = Object.entries(domain);
    test.listener = ({target}) => {
        const instance = target;
        const yieldSets = function*() {
            for(const [varname,ctor] of domains) {
                if(instance instanceof ctor) { // throws
                    bindings[varname].add(instance);
                    yield Object.entries(bindings).map(([key,instances]) => {
                        if(varname===key) return [instance];
                        return instances;
                    })
                }
            }
        }
        let run;
        const t0 = performance.now();
        for(const sets of yieldSets()) {
            for(const binding of cartesian(...sets)) {
                let arg = binding.reduce((arg,instance,i) => {
                    arg[varnames[i]] = instance;
                    return arg;
                },{})
                agenda.push(priority,() => test.execute(arg));
                run = true;
            }
        }
        if(run) {
            const t1 = performance.now();
            agenda.stats.matchTime += (t1 - t0);
            agenda.run();
        }
    };
    test.execute = (arg) => {
        const binding = {...arg},
            listener = () => {
                let arg = binding;
                setChangeListener(listener);
                const t0 = performance.now();
                if(test(arg)) {
                    if(!Object.values(arg).some((instance) => isRetracted(instance))) {
                        const t1 = performance.now();
                        for(const consequent of test.consequences) {
                            const ctx = {
                                withConfidence: (confidence, ...instances) => withConfidence(consequent.confidence * confidence, conditions, ...instances),
                                justifies: (conditions, ...instances) => justifies(listener.watches, conditions, ...instances),
                                when: test
                            };
                            arg = consequent.call(ctx,arg);
                            if(arg===undefined) break;
                        }
                        const t3 = performance.now();
                        return {testTime:t1-t0,actionTime:t3-t1};
                    }
                }
                return false;
            };
        return listener();
    }
    test.then = (consequent,{confidence=1}={}) => {
        consequent.confidence = confidence;
        test.consequences.push(consequent);
        return test;
    }
    test.consequences = [];
    domains.forEach(([varname,ctor]) => {
        if(!ctor.watchlight) throw new TypeError(`Constructor ${ctor.name} must be Observable`);
        bindings[varname] ||= new Set();
        varnames.push(varname);
        ctor.subscribe(test.listener);
    });
    return test;
}

const retract = (object) => {
   return object.isTracked() ? object.stopTracking() : false;
}

const isRetracted = (object) => {
    return !object.isTracked();
}

const withConfidence = (confidence= 1,conditions,...instances) => {
    const conditionConfidence = Object.values(conditions).reduce((confidence,condition) => Math.min(condition.confidence,confidence),Infinity);
    instances.forEach((instance) => {
        instance.withOptions({confidence:confidence * conditionConfidence});
    });
    return instances;
}

const justifies = (tested,conditions,...instances) => {
    Object.values(conditions).forEach((justification) => {
       const properties = tested.get(justification.constructor);
       if(properties) {
            const listener = ({target,property}) => {
                   if(property in properties) {
                       instances.forEach((instance) => retract(instance));
                   }
                };
            setChangeListener(listener);
            // force value access to register change listener
            const values = Object.keys(properties)
               .reduce((values,property) => {
                   values[property] = justification[property];
                   return values;
               },{});
            // todo: do something with values in case people want to see justification?
       }
    })
    Object.values(conditions).forEach((condition) => {
        instances.forEach((instance) => {
            condition.watchlight.dependentInstances.add(instance);
        })
    })
    instances.withConfidence = (confidence=1) => withConfidence(confidence,conditions,...instances);
    return instances;
}

function ObserverableForRules(target,{global,partials= true}={}) {
    const observable = Observable(target,{global,observeInstances:true,trackInstances:true,partials});
    if(typeof(target)==="function") observable.watchlight.retractedInstances = new Set();
    return observable;
}

export {exists,getStats,not,resetStats,retract,run,when,ObserverableForRules as Observable};