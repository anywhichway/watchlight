import {observer, reactive} from "./index.js";

const FUNCTIONS = {
    // Logical and Info
    iff(test, value1, value2) {
        return !!test ? value1 : value2;
    },
    isboolean(value) {
        return typeof (value) === "boolean";
    },
    isdimension(value) {
        if(value && typeof(value)==="object" && typeof(value.isDimension)==="function") {
            return value.isDimension();
        }
        return false;
    },
    isundefined(value) {
        return typeof (value) === "undefined";
    },
    islogical(value) {
        return typeof (value) === "boolean";
    },
    isnumber(value) {
        return typeof (value) === "number";
    },
    isobject(value) {
        return value && typeof (value) === "object";
    },
    isstring(value) {
        return typeof (value) === "string";
    },
    len(value) {
        if(value && value.length) return value.length;
        if(value && value.count) return typeof(value.count)==="function" ? value.count() : value.count;
    },
    // Math
    average(...values) {
        return this.sum(...values) / this.count(...values);
    },
    count(...values) {
        return this.numbers(...values).length;
    },
    countblank(...values) {
        return this.values(...values).length;
    },
    exp(number,power) {
        return Math.pow(number,power);
    },
    log10(number) {
        return Math.log10(number);
    },
    max(...values) {
        return this.numbers(...values).reduce((max, value) => typeof (value) === "number" ? Math.max(max, value) : max, -Infinity)
    },
    mean(...values) {
        return this.average(...values);
    },
    median(...values) {
        values = this.numbers(...values);
        values = values.sort((a, b) => a - b);
        const mid = values.length / 2;
        return mid % 1 ? values[mid - 0.5] : (values[mid - 1] + values[mid]) / 2;
    },
    min(...values) {
        return this.numbers(...values).reduce((min, value) => typeof (value) === "number" ? Math.min(min, value) : min, Infinity)
    },
    product(...values) {
        return this.numbers(...values).reduce((product, value) => product *= value, 1)
    },
    stdev(...values) {
        return Math.sqrt(this.variance(...values));
    },
    sum(...values) {
        return this.numbers(...values).reduce((sum, value) => sum += value, 0)
    },
    variance(...values) {
        values = this.numbers(...values);
        const avg = this.average(...values);
        return this.average(...values.map((num) => Math.pow(num - avg, 2)));
    },
    zscores(...values) {
        values = this.numbers(...values);
        const mean = this.average(...values),
            stdev = this.stdev(...values);
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
        Math.asin(number);
    },
    asinh(number) {
        Math.asinh(number);
    },
    atan(number) {
        Math.atan(number);
    },
    atan2(number) {
        Math.atan2(number);
    },
    cos(number) {
        Math.cos(number);
    },
    cosh(number) {
        Math.cosh(number);
    },
    pi() {
        3.14159265358979;
    },
    rand() {
        Math.random();
    },
    sin(number) {
        Math.sin(number);
    },
    tan(number) {
        Math.tan(number);
    },
    tanh(number) {
        Math.tanh(number);
    },
    // Coercion
    int(value) {
        return Math.round(parseInt(value+""));
    },
    float(value) {
        return parseFloat(value+"") * 1.0;
    },
    lower(value) {
        return (value+"").toLowerCase();
    },
    numbers(data,start,end) {
        const values = this.values(data,start,end);
        return values.reduce((numbers,value) => {
            if(Array.isArray(value)) return numbers.concat(...this.numbers(...value))
            if(this.isdimension(value)) return this.numbers(...Object.values(value));
            if(value && typeof(value.valueOf)==="function") value = value.valueOf();
            if(typeof(value)==="number") numbers.push(value)
            return numbers;
        },[])
    },
    numbersa(data,start,end) {
        const values = this.values(data,start,end);
        return values.reduce((numbers,value) => {
            if(Array.isArray(value)) return numbers.concat(...this.numbers(...value))
            if(this.isdimension(value)) return this.numbers(...Object.values(value));
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
    values(data, start, end) {
        if(!data || (!Array.isArray(data) && !this.isdimension(data))) return [];
        if(!start && end===undefined) return Object.values(data);
        const reverse = end !== undefined && start > end && end > 0,
            numbers = typeof (start) === "number",
            result = [];
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
            if (key >= start && (!end || key <= end)) result.push(data[key]);
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

const Sheet = (functions = {}, root) => {
    if (functions) Object.assign(FUNCTIONS, functions);
    const proxy = new Proxy(reactive({}), {
        get(target, property) {
            if(property==="isDimension") return ()=> true;
            return target[property] ||= Sheet(null, root || target);
        },
        set(target, property, value) {
            if (typeof (value) === "function") {
                const data = {},
                    body = getFunctionBody(value),
                    f = Function("functions", "data", "return function() { return data.value = (() => { with(functions) { with(this) { " + (body.includes("return") ? body : "return " + body) + " }}})() }")(FUNCTIONS, data),
                    o = target[property] = observer(f, root || target),
                    valueOf = () => {
                        if(data.value!==valueOf.oldValue) {
                            setTimeout(() => target[property] = o); // force dependency recalc
                        }
                        return valueOf.oldValue = data.value;
                    };
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