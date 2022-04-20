import {from,observable,pipe,range,registerEventTypes,split,subscribe,merge,Observable,setChangeListener} from "../observable.js";
import {scan,count,debounceTime,delay,filter,max,min,reduce, skipWhile,sum, timeThrottle,takeFinal} from "../operators.js";
import {when,Observable as RuleObservable} from "../rule.js";

registerEventTypes("click");

pipe([timeThrottle(5000),debounceTime(1000),delay(5000)],document.getElementById("b1"))
    .addEventListener("click",(event) => {
        console.log(event);
    })

const b2 = subscribe("click",document.getElementById("b2")),
    b3 = subscribe("click",document.getElementById("b3"));

merge(b2,b3).subscribe((value) => console.log(value));

const [s1,s2] = split(b2,{},{});
s1.subscribe((value) => console.log("s1",value));
s2.subscribe((value) => console.log("s2",value));

const r1 = range(1,10);

r1.subscribe((value) => console.log(value));

subscribe((value) => console.log(-value),r1);

r1.pipe(max()).subscribe((value) => console.log("max",value));

r1.pipe(min()).subscribe((value) => console.log("min",value));

r1.pipe(reduce((current,value) => current + value)).subscribe((value) => console.log("sum",value));

r1.pipe(sum()).subscribe((value) => console.log("sum",value));

const values = from(['Green Arrow', 'SuperMan', 'Flash', 'SuperGirl', 'Black Canary']);

values.pipe(skipWhile((hero) => hero !== 'SuperGirl'))
    .subscribe((value) => console.log(value));

values.pipe(takeFinal()).subscribe((value)=> console.log("final:",value));

values.pipe(count()).subscribe((value) => console.log("count",value));

const o = subscribe({listener:(event) => console.log(event),eventType:"change"},{name:"joe"});
o.name = "mary";


const [o1,o2] = subscribe("change",{name:"joe",age:21},{name:"mary",age:30})
    .map((observable,i,objects) => {
        return observable.pipe(({target}) => {
            return function*() {
                // this is the rule condition
               for(const object of objects) {
                   if(object.target!==target.target && object.age==target.age) yield [target,object];
               }
            }
        }).subscribe((value) => console.log(value));
    })


o1.name = "bill";
o2.age = 21;



(() => {

    RuleObservable(Object);

    //(() => {
        class Person extends Object {
            constructor(config) {
                super();
                Object.assign(this,config);
            }
        }
        Person = RuleObservable(Person);
   // })();



    when(({person1,person2}) => {
       return person1.name!==person2.name;
    },{person1:Person,person2:Person})
        .then(({person1,person2}) => person1)
        .then(person => console.log(person.name,"has a new match"));

    when(({person}) => {
        return person.name==="max";
    },{person:Person})
        .then(({person}) => console.log(person.name,"is max!"));


    when(({object}) => {
        return true;
    },{object:Object})
        .then(({object}) => {
            console.log("new object",object)
        });


    new Person({name:"mary"});
    const person1 = new Person({name:"joe"});
    setTimeout(() => {
        person1.name="max"
    },1000);
})();

(() => {
    let CURRENTFORMULA;
    const Dimension = ({address=[],path=[]}={}) => {
        const dependents = {},
            locals = {
                isDimension() {
                    return true;
                }
            },
            proxy = new Proxy({}, {
                get(target, property) {
                    if (locals[property]) return true;
                    if (CURRENTFORMULA && CURRENTFORMULA.address !== [...address, property].join(".")) {
                        dependents[property] ||= new Set();
                        dependents[property].add(CURRENTFORMULA)
                    }
                    if (property === "path") return path.join(".");
                    if (target[property] === undefined) target[property] = Dimension({address:[...address, property],path:[...path,proxy]});
                    return target[property];
                },
                set(target, property, value) {
                    let f;
                    if (typeof (value) === "function") {
                        f = () => {
                            CURRENTFORMULA = f;
                            const result = value([...path,proxy]);
                            if(result && typeof(result)==="object" && result instanceof Promise) result.then((value) => f.value = value);
                            else f.value = result;
                            CURRENTFORMULA = null;
                            return result;
                        }
                        f.valueOf = () => f.value;
                        f.formatedValue = () => f.format ? f.format(f.value) : f.value;
                        f.address = [...address, property].join(".");
                        target[property] = f;
                    } else {
                        target[property] = value;
                    }
                    if (f) f();
                    if (dependents[property]) {
                        [...dependents[property]].forEach((dependent) => dependent());
                    }
                    return true;
                }
            });
        return proxy;
    }

    const Sheet = Dimension;

    const isDimension = (value) => {
        return value && typeof (value) === "object" && typeof (value.isDimension) === "function" && value.isDimension();
    }

    const isRangeSpec = (value) => {
        return value && typeof (value) === "object" && (value.start !== undefined || value.end !== undefined) && Object.keys(value).length === 2;
    }

    const dimensioned = (f) => {
        return (...args) => {
            if (args.length === 2) {
                const last = args[args.length - 1];
                if (!isDimension(last) && isRangeSpec(last)) {
                    return f(range(...args));
                }
            }
            return f(...args);
        }
    }

    function count(...args) {
        return args.flat().length;
    }
    count = dimensioned(count);

    function sum(...args) {
        return args.flat().reduce((sum,value) => {
            if(value) value = value.valueOf();
            if(typeof(value)==="number") sum += value;
            return sum;
        },0);
    }
    sum = dimensioned(sum);

    const functions = {
        count,
        range,
        sum
    }

    function range(value, {start, end} = {}) {
        if (value && typeof (value) === "object") {
            if (value instanceof Array) {
                start ||= 0;
                end ||= value.length - 1;
                return value.slice(parseInt(start), parseInt(end));
            }
            return Object.entries(value).reduce((values, [key, value]) => {
                if (typeof (start) === "number" || typeof (end) === "number") key = parseInt(key);
                if ((!start || key >= start) && (!end || key <= end)) values.push(value);
                return values;
            }, [])
        }
    }


    const sheet1 = Sheet();
    sheet1.tab1.A[1] = 1;
    sheet1.tab1.A[2] = 1;
    sheet1.tab1.B[1] = () => sheet1.tab1.A[1];
    sheet1.tab1.B[2] = ([sheet,tab,col]) => {
        return sum(tab.A, {start: 1, end: 2});
    };
    sheet1.tab1.B[3] = ([sheet,tab,col]) => {
        return sum(range(tab.A, {start: 1, end: 2}),range(tab.B,{end:1}));
    };
    sheet1.tab1.A[1] = 2;
    setTimeout(() => console.log(sheet1.tab1.B[1].valueOf()));
    setTimeout(() => console.log(sheet1.tab1.B[2].valueOf()));
    setTimeout(() => console.log(sheet1.tab1.B[3].valueOf()));
})();