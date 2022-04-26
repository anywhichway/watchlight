import {deepEqual, asyncScheduler, Observable} from "./observable.js";

const yields = async function*(callback,initial) {
    let hasrun, value;
    value = await callback(hasrun ? value : initial);
    if(!hasrun) hasrun = true;
    return value;
}

const avg = (iff) => {
    let total = 0, count = 0;
    return (value) => {
        if(value===undefined) return count > 0 ? total/count : 0;
        total += iff ? (iff(value) ? value : 0) : value;
        count += iff ? (iff(value) ? 1 : 0) : 1;
    }
}

const count = (predicate=()=>{}) => {
    let counted = 0;
    return (value,observer) => {
        if(value===undefined) return counted;
        if(predicate(value,counted,observer)) counted++;
    }
}

const delay = (delay,scheduler=asyncScheduler,clock) => {
    return scheduler ? scheduler(delay,clock) : (value) => value;
}

const debounceTime = (ms) => {
    let time, timeout;
    return async (value) => {
        return new Promise((resolve) => {
            if(!time || Date.now() >= time + ms) {
                time = Date.now();
                timeout = setTimeout(() => {
                    timeout = null;
                    time = null;
                    resolve(value)
                },ms);
                return;
            }
            clearTimeout(timeout);
            timeout = null;
            time = null;
            resolve();
        })
    }
}

const distinct = (keySelector) => {
    const seen = new Set();
    return (value) => {
        if(value===undefined) return;
        const seenvalue = keySelector ? keySelector(value) : value;
        if(seen.has(seenvalue)) return;
        seen.add(seenvalue)
        return value;
    }
}

const distinctUntilChanged = (comparator=(previous,current) => previous===current,keySelector) => {
    let previous;
    return (value) => {
        if(value===undefined) return;
        const current = keySelector ? keySelector(value) : value;
        if(comparator(previous,current)) return;
        previous = current;
        return value;
    }
}

const distinctUntilKeyChanged = (key,comparator=(previous,current) => previous===current) => {
   return distinctUntilChanged(comparator,(value) => value[key]);
}


const elementAt = (index) => {
    let i = 0;
    return (value) => {
        if(i===index) return value;
        i++;
    }
}

const filter = (f) => {
    let count = 0;
    return (value,observable) => {
        return f(value,count++,observable) ? value : undefined;
    }
}

const first = (f) => {
    let first, count = 0;
    return (value,observable) => {
        if(value===undefined && first===undefined) return new TypeError("first never received a value")
        if(first!==undefined) return;
        if(f(value,count++,observable)) {
            return first = value;
        }
    }
}

const ignoreElements = () => {
    return () => {};
}

const map = (map) => {
    return (value) => map(value);
}

const max = (compare) => {
    let maximum;
    return (value) => {
        if(value===undefined) return maximum;
        if(compare) maximum = compare(maximum,value);
        else maximum = maximum===undefined || value > maximum ? value : maximum
    }
}

const min = (compare) => {
    let minimum;
    return (value) => {
        if(value===undefined) return minimum;
        if(compare) minimum = compare(minimum,value);
        else minimum = minimum===undefined || value < minimum ? value : minimum;
    }
}

const multiple = (count,predicate=() => true) => {
    let found = [];
    return (value,observable) => {
        if(value===undefined) {
            if(found.length==0) return new TypeError("multiple never received a value");
            if(found.length<count) return new TypeError(`multiple received less than ${count}`);
            if(found.length>count) return new TypeError(`multiple received more than ${count}`);
            return found;
        }
        if(predicate(value,found.length-1,observable)) {
            if(found.length<=count) found.push(value); // save memory, only cache one extra
        }
    }
}

const product = (iff) => {
    let total = 1;
    return (value) => {
        if(value===undefined) return total;
        total *= iff ? (iff(value) ? value : 1) : value;
    }
}

const reduce = (reducer,seed) => {
    let reduced = seed;
    return (value) => {
        if(value===undefined) return reduced;
        if(reduced===undefined) reduced = value;
        else reduced = reducer(reduced,value);
    }
}

const scan = (aggregator,seed) => {
    let accum = seed;
    return (value) => {
        if(value===undefined) return;
        if(accum===undefined) accum = value;
        else accum = aggregator(accum,value);
        return accum;
    }
}

const single = (predicate=() => true) => {
    let found, count = 0;
    return (value,observable) => {
        if(value===undefined) {
            if(found===undefined) return new TypeError("single never received a value");
            return found;
        }
        if(predicate(value,count++,observable)) {
            if(found===undefined) {
                found = value;
            } else {
                found = new TypeError("single received more than one value");
            }
        }
    }
}

const skip = (count) => {
    let counted = 0;
    return (value) => {
        counted++;
        if(counted>count) return value;
    }
}

const skipUntil = (observable) => {
    let seen,
        subscription = Observable(observable,{noClone:true}).subscribe((value) => seen = value);
    return (value) => {
        if(seen!=undefined) {
            if(subscription) {
                subscription.unsubscribe();
                subscription = null;
            }
            return value;
        }
    }
}

const skipUntilTime = (future,clock= Date) => {
    const time = typeof (future) === "number" ? future : future.getTime();
    return (value) => clock.now() >= time ? value : undefined;
}

const skipWhile = (test) => {
    let seen, locked;
    return (value) => {
        if((seen===undefined || seen) && !locked) seen = test(value);
        if(!seen) { locked = true; return value; }
    }
}

const sum = (iff) => {
    let total = 0;
    return (value) => {
        if(value===undefined) return total;
        total += iff ? (iff(value) ? value : 0) : value;
    }
}

const take = (count) => {
    let counter = 1;
    return (value) => {
        if(counter++<=count) return value;
    }
}

const takeUntil = (observable) => {
    let seen,
        subscription = Observable(observable,{noClone:true}).subscribe((value) => seen = value);
    return (value) => {
        if(seen===undefined) return value;
        if(subscription) {
            subscription.unsubscribe();
            subscription = null;
        }
    }
}

const takeUntilTime = (future,clock= Date) => {
    const time = typeof (future) === "number" ? future : future.getTime();
    return (value) => clock.now() > time ? undefined : value;
}

const takeWhile = (test) => {
    let failed;
    return (value) => {
        if(!failed && test(value)) return value;
        failed = true;
    }
}

const takeFinal = () => {
    let previous;
    return (value) => {
        if(value===undefined) return previous;
        previous = value;
    }
}

const timeThrottle = (ms) => {
    let time
    return (value) => {
        if(time===undefined || Date.now() >= time + ms) {
            time = Date.now();
            return value;
        }
    }
}

const when = (iff,callback) => {
    return (value) => {
        if(typeof(iff)==="function" ? iff(value) : value===iff) callback(value);
        return value;
    }
}

export {avg, filter, first, count, elementAt,
        delay, debounceTime,
    distinct, distinctUntilChanged, distinctUntilKeyChanged,
    ignoreElements,
        map, max, min, multiple,
        product, reduce,
    single,
        skip, skipUntil, skipUntilTime, skipWhile,
        scan, sum,
        take, takeFinal, takeUntil, takeUntilTime, takeWhile,
        timeThrottle, when, yields }