import {deepEqual} from "./watchlight.js";

const yields = async function*(callback,initial) {
    let hasrun, value;
    value = await callback(hasrun ? value : initial);
    if(!hasrun) hasrun = true;
    return value;
}


const count = (counter) => {
    let counted = 0;
    return (value) => {
        if(value===undefined) return counted;
        if(counter) counted += counter(value);
        else counted++;
    }
}

const delay = (delay) => {
    return async (value) => {
        return new Promise((resolve) => {
            if(typeof(delay)==="number") {
                setTimeout(() => resolve(value), delay);
            }
            else if(delay && typeof(delay)==="object" && delay instanceof Date) {
                setTimeout(()=> resolve(value),delay.getTime() - Date.now())
            }
        })
    }
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

const filter = (f) => {
    return (value) => f(value) ? value : undefined;
}

const map = (map) => {
    return (value) => map(value);
}

const max = (compare) => {
    let maximum;
    return (value) => {
        if(value===undefined) return maximum;
        if(compare) maximum = compare(maximum,value);
        else maximum = maximum===undefined || value > maximum ? value : maximum;
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

const reduce = (reducer,seed) => {
    let reduced = seed;
    return (value) => {
        if(value===undefined) return reduced;
        if(reduced===undefined) reduced = value;
        else if(reducer) reduced = reducer(reduced,value);
    }
}

const scan = (aggregator,seed) => {
    let aggregate = seed;
    return (value) => {
        if(value===undefined) return aggregate;
        aggregate = aggregator(aggregate);
    }
}

const skipUntil = (observed,eventName="*") => {
    let seen;
    observed.subscribe(eventName,(event) => seen = event);
    return (value) => seen!=undefined ? value : undefined;
}

const skipUntilTime = (future) => {
    const time = typeof (future) === "number" ? future : future.getTime();
    return (value) => Date.now() >= time ? value : undefined;
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

const takeUntil = (observed,eventName="*") => {
    let seen;
    observed.subscribe(eventName, (event) => seen = event);
    return (value) => seen == undefined ? value : undefined;
}

const takeUntilTime = (future) => {
    const time = typeof (future) === "number" ? future : future.getTime();
    return (value) => Date.now() < time ? value : undefined;
}

const takeWhile = (test) => {
    let seen, done;
    return (value) => {
        if(done) return;
        if(seen===undefined) seen = test(value);
        if(seen) return value;
        done = true;
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

export {filter, count, delay, debounceTime, map, max, min, reduce,
        skipUntil, skipUntilTime, skipWhile,
        scan, sum,
        takeFinal, takeUntil, takeUntilTime, takeWhile,
        timeThrottle, yields }