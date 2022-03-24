import {observer, reactive} from "./index.js";

const hasKeys = (value) => {
    if(value && typeof(value)==="object") for(const key in value) return true
    return false;
}
const isDimension = (value) => {
    if(value && typeof(value)==="object" && typeof(value.isDimension)==="function") {
        return value.isDimension();
    }
    return false;
}

const FUNCTIONS = {
    // Logical and Info
    count(values) {
        return this.numbers(values).length;
    },
    counta(values) {
        return this.values(values).length;
    },
    iff(test, value1, value2) {
        return !!test ? value1 : value2;
    },
    isblank(value) {
        if(this.isdimension(value)) return !hasKeys(value);
        return value==null;
    },
    isboolean(value) {
        return typeof (value) === "boolean";
    },
    isdimension(value) {
        return isDimension(value);
    },
    isempty(value) {
        return this.isblank(value) || value===""
    },
    isundefined(value) {
        return typeof (value) === "undefined";
    },
    islogical(value) {
        return this.isboolean(value);
    },
    isnumber(value) {
        return typeof (value) === "number";
    },
    isobject(value) {
        return !!(value && typeof (value) === "object" && !this.isdimension(value));
    },
    isstring(value) {
        return typeof (value) === "string";
    },
    len(value) {
        if(value) {
            if(value.length!==undefined) {
                const type = typeof(value.length);
                if(type==="function") return value.length();
                if(type==="number") return value.length;
            }
            if(value.count!==undefined) {
                const type = typeof(value.count);
                if(type==="function") return value.count();
                if(type==="number") return value.count;
            }
        }
        throw new TypeError(`len:${value} does not have a length or count property that resolves to a number.`)
    },
    // Math
    average(values,{start,end,matrix}={}) {
        values = this.numbers(values,{start,end,matrix})
        return this.sum(values) / values.length;
    },
    exp(number,power) {
        return Math.pow(number,power);
    },
    log10(number) {
        return Math.log10(number);
    },
    max(values,{start,end,matrix}={}) {
        return this.numbers(values,{start,end,matrix}).reduce((max, value) => typeof (value) === "number" ? Math.max(max, value) : max, -Infinity)
    },
    mean(values,{start,end,matrix}={}) {
        return this.average(values,{start,end,matrix});
    },
    median(values,{start,end,matrix}={}) {
        values = this.numbers(values,{start,end,matrix});
        values = values.sort((a, b) => a - b);
        const mid = values.length / 2;
        return mid % 1 ? values[mid - 0.5] : (values[mid - 1] + values[mid]) / 2;
    },
    min(values,{start,end,matrix}={}) {
        return this.numbers(values,{start,end,matrix}).reduce((min, value) => typeof (value) === "number" ? Math.min(min, value) : min, Infinity)
    },
    product(values,{start,end,matrix}={}) {
        return this.numbers(values,{start,end,matrix}).reduce((product, value) => product *= value, 1)
    },
    stdev(values,{start,end,matrix}={}) {
        return Math.sqrt(this.variance(values,{start,end,matrix}));
    },
    sum(values,{start,end,matrix}={}) {
        return this.numbers(values,{start,end,matrix}).reduce((sum, value) => sum += value, 0)
    },
    variance(values,{start,end,matrix}={}) {
        values = this.numbers(values,{start,end,matrix});
        const avg = this.average(values);
        return this.average(values.map((num) => Math.pow(num - avg, 2)));
    },
    zscores(values,{start,end,matrix}={}) {
        values = this.numbers(values,{start,end,matrix});
        const mean = this.average(values),
            stdev = this.stdev(values);
        return values.map((num) => (num - mean) / stdev);
    },
    // Trig
    acos(number) {
        return Math.acos(number);
    },
    acosh(number) {
        return Math.acosh(number);
    },
    asin(number) {
        return Math.asin(number);
    },
    asinh(number) {
        return Math.asinh(number);
    },
    atan(number) {
        return Math.atan(number);
    },
    atan2(number) {
        return Math.atan2(number);
    },
    cos(number) {
        return Math.cos(number);
    },
    cosh(number) {
        return Math.cosh(number);
    },
    pi() {
        return 3.14159265358979;
    },
    rand() {
        return Math.random();
    },
    sin(number) {
        return Math.sin(number);
    },
    tan(number) {
        return Math.tan(number);
    },
    tanh(number) {
        return Math.tanh(number);
    },
    // Coercion
    int(value) {
        return parseInt(value+"");
    },
    float(value) {
        return parseFloat(value+"") * 1.0;
    },
    lower(value) {
        return (value+"").toLowerCase();
    },
    numbers(data,{start,end,matrix}={}) {
        const values = this.values(data,{start,end,matrix});
        return values.reduce((numbers,value) => {
            if(Array.isArray(value)) return numbers.concat(...this.numbers(value))
            if(this.isdimension(value)) return this.numbers(Object.values(value));
            if(value && typeof(value.valueOf)==="function") value = value.valueOf();
            if(typeof(value)==="number") numbers.push(value)
            return numbers;
        },[])
    },
    numbersa(data,{start,end,matrix}={}) {
        const values = this.values(data,start,end);
        return values.reduce((numbers,value) => {
            if(Array.isArray(value)) return numbers.concat(...this.numbersa(...value))
            if(this.isdimension(value)) return this.numbersa(Object.values(value));
            if(value && typeof(value.valueOf)==="function") value = value.valueOf();
            if(typeof(value)==="string") value = parseFloat(value);
            if(typeof(value)==="boolean") value = value ? 1 : 0;
            if(typeof(value)==="number" && !isNaN(value)) numbers.push(value);
            return numbers;
        },[])
    },
    upper(value) {
        return (value+"").toUpperCase();
    },
    value(data) {
        return parseFloat(data);
    },
    values(data, {start, end}={}) {
        if(!data || (!Array.isArray(data) && !this.isdimension(data))) return [];
        if(!start && end===undefined) return Object.values(data);
        const reverse = end !== undefined && start > end && end > 0,
            numbers = typeof (start) === "number";
        let result = [];
        if (reverse) {
            const temp = end;
            start = end;
            end = temp;
        }
        for (let key in data) {
            if (numbers) {
                key = parseInt(key);
                if (isNaN(key)) continue;
            }
            if (key >= start && (!end || key <= end)) {
                const value = data[key];
                if(value===undefined) continue
                if(this.isdimension(value)) {
                    result = result.concat(...this.values(value))
                } else {
                    result.push(value);
                }
            }
            if (numbers && key >= end) break;
        }
        return reverse ? result.reverse() : result;
    }
}

const getFunctionBody = (f) => {
    const string = f.toString();
    if (string[string.length - 1] === "}") return string.substring(string.indexOf("{") + 1, string.length - 1);
    return string.substring(string.indexOf(">") + 1);
}

const withFormat = function(format) {
    if(typeof(format)==="string") {
        format = Function("return `" + format + "`");
    }
    this.format = format;
}
const enhanceObserver = (o,valueOf) => {
    Object.defineProperty(valueOf,"oldValue",{configurable:true,writable:true});
    Object.defineProperty(o,"valueOf",{configurable:true,writable:true,value:valueOf});
    Object.defineProperty(o,"withFormat",{configurable:true,writable:true,value:withFormat});
    return o;
}

const isError = (value) => !!(value && typeof(value)==="object" && value instanceof Error);

const DIMENSIONFUNCTIONS = {
    isdimension: true,
    isblank: true,
    isempty: true,
    count: true,
    counta: true,
    values: true,
    numbers: true,
    numbersa: true,
    average: true,
    max: true,
    median: true,
    min:true,
    product:true,
    stdev:true,
    sum: true,
    variance: true,
    zscores: true
}

Object.entries(FUNCTIONS).forEach(([key,f]) => {
    FUNCTIONS[key] = function(...args) {
        if(isDimension(args[0]) && !DIMENSIONFUNCTIONS[key]) {
            return new TypeError(`${key}(${args[0].path}) '${args[0].path}' is a Dimension not a value or Cell.`)
        }
        if(isError(args[0])) return args[0];
        try {
            return f.call(this,...args);
        } catch(e) {
            return e;
        }
    }
})

const Sheet = (functions = {}, {root,path=""}={}) => {
    if (functions) Object.assign(FUNCTIONS, functions);
    const proxy = new Proxy(reactive({}), {
        get(target, property) {
            if(property==="isDimension") return ()=> true;
            if(property==="path") return path;
            return target[property]!==undefined ? target[property] : (target[property] = Sheet(null, {root:root || target,path:path ? path + "." + property : property}));
        },
        set(target, property, value) {
            if(property==="path") throw new TypeError(`can't assign read-only property "path" on Dimension`)
            if (typeof (value) === "function") {
                const data = {},
                    body = getFunctionBody(value),
                    f = Function("functions", "data", "return function() { return data.value = (() => { with(functions) { with(this) { " + (body.includes("return") ? body : "return " + body||undefined) + " }}})() }")(FUNCTIONS, data),
                    o = target[property] = observer(f, root || target),
                    valueOf = () => {
                        if(data.value!==valueOf.oldValue) {
                            setTimeout(() => target[property] = o); // force dependency recalc
                        }
                        return valueOf.oldValue = data.value;
                    };
                    o.withOptions({onerror:(e) => e});
                enhanceObserver(o,valueOf);
            } else {
                target[property] = value;
            }
            return true;
        }
    })
    return proxy;
}

export {Sheet as default, Sheet}