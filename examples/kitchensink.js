import {reactive,run,assert,retract,when,whilst,not,exists,observer,unobserve,deepEqual} from "../index.js";

var mary, joe;

class Person {
    constructor(config) {
        Object.assign(this,config);
    }
}
Person = reactive(Person);

class Combo extends Array {
    constructor(...args) {
        super();
        args.forEach((arg,i) => this[i] = arg)
    }
    equals(combo) {
        return combo.length===this.length && combo.every((a) => this.some((b) => deepEqual(a,b)));
    }
}
Combo = reactive(Combo);

const pp = when(({person}) => {
    return person.name!==undefined
},{person:Person})
    .then(({person}) => console.log(person))
    .addEventListener("fire",(event) => console.log(event));

pp({person:Person({"name":"bill"})});

whilst(function match({person1,person2}) {
    return person1.name!==person2.name && not(Combo(person1,person2));
},({person1,person2}) => Combo(person1,person2), {person1:Person,person2:Person},{onassert:(event) => console.log(event)})
    .withOptions({priority:10})
    .then((combo) => {
        combo.addEventListener("retract",() => console.log("retracted",combo));
        return combo;
    })
    .then((combo) => console.log("A pair!",combo))


when(({person}) => person.name==="joe",{person:Person})
    .withOptions({priority:-50})
    .then(({person}) => { retract(person); return {person} })
    .then(({person}) => console.log("retracted",person))

when(({person}) => person.name==="joe",{person:Person})
    .withOptions({priority:-100})
    .then(({person}) => console.log("joe",person))

joe = assert(Person({name:"joe",age:28}));
joe.addEventListener("change",(event) => console.log(event), {synchronous:true});
joe.when(function(joe) { return joe.age>27 })
    .then((joe) => console.log("joe too old",joe.age));
joe.when(function({bound,partner}) {
    return partner.name!==bound.name
},{partner:Person})
    .then(({bound,partner}) => console.log("joe partner",partner));

mary = assert(Person({name:"mary"}));
mary.addEventListener("defineProperty",(event) => console.log(event));
mary.age = 25;

observer((message) => {
    console.log(message,mary.age,unobserve(()=> mary.name));
},null,"Mary's age and name are ")

class Counter {
    constructor() { this.count=0; }
}
Counter = reactive(Counter);

when(({counter}) => counter.count<10,{counter:Counter})
    .withOptions({priority:-20})
    .then(({counter}) => { counter.count++; return {counter}})
    .then(({counter}) => { console.log("count:",counter.count); if(counter.count===10) { throw new Error("maxcount") } else { return {counter} } })
    .catch((e) => { console.log(e); return e; });

assert(Counter());

when(function count({counter}) {
    return counter<10
},{counter:Number})
    .withOptions({priority:-10})
    .then(({counter}) => {
        counter.setValue(counter+1);
        console.log("primitive",counter.valueOf());
        return {counter}})
    .catch((e) => { console.log(e); return e;} );

assert(new Number(0));

//run({limit:Infinity,trace:{run:true,retract:true}});
run({trace:{run:true}});

class _Table {
    constructor() {
        this.content = {};
        this.colNames = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split();
    }
    toColName(index) {
        return this.colNames[index];
    }
    hasCol(key) {
        return this.colNames.includes(key)
    }
    validateCol(key) {
        if(!this.hasCol(key)) throw new TypeError(`${key} is not a valid column in ${this.name}`);
        return key;
    }
    delete(dimension) {
        if(type==="number") {
            this.deleteRow(dimension)
        } else if(type==="string") {
            this.deleteCol(dimension)
        }
        throw new TypeError(`Tab:insert(dimension,data) expected a number or string for dimension`);
    }
    deleteRow(row) {
        if(typeof(row)!=="number") throw new TypeError(`Tab:deleteRow(row) expected a number for row`);
        delete this.content[row];
    }
    deleteCol(col) {
        col = this.validateCol(col);
        Object.values(this.content)
            .forEach((row) => {
                Object.keys(row)
                    .sort()
                    .forEach((colName) => {
                        if(colName>col) {
                            row[this.colNames[this.colNames.indexOf(colName)-1]] = row[colName];
                        }
                    })
            })
    }
    insert(dimension,data={}) {
        const type = typeof(dimension)
        if(type==="number") {
            this.insertRow(dimension,data)
        } else if(type==="string") {
            this.insertCol(dimension,data)
        }
        throw new TypeError(`Tab:insert(dimension,data) expected a number or string for dimension`);
    }
    insertRow(row,data={}) {
        if(!data || typeof(data)!=="object") throw new TypeError(`Tab:insertRow(row,data) expected an object for data`);
        if(typeof(row)!=="number") throw new TypeError(`Tab:insertRow(row,data) expected a number for row`);
        const content = this.content;
        Object.entries(content)
            .map(([key,value]) => [parseInt(key),value])
            .sort((a,b) => b - a)
            .forEach(([key,value]) => {
                if(key > row) this[key+1] = value;
            });
        const target = content[row] = {};
        if(Array.isArray(data)) {
            data.forEach((value,index) => target[this.validateColName(this.toColName(index))] = value);
        } else {
            Object.entries(data).forEach(([key,value]) => target[this.validateCol(key)] = value);
        }
    }
    insertCol(col,data=[]) {
        if(!data || typeof(data)!=="object") throw new TypeError(`Tab:insertRow(number,data) expected an object for data`);
        col = this.validateCol(col);
        const content = this.content;
        Object.values(content)
            .forEach((row,index) => {
                const value = data[index]
                if(value!==undefined) {
                    Object.keys(row)
                        .sort((a,b) => b > a ? -1 : b < a ? 1 : 0)
                        .every((colName) => {
                            if(colName>col) {
                                row[this.colNames[this.colNames.indexOf(colName)+1]] = row[colName];
                                return true;
                            }
                            if(colName===col) {
                                row[col] = value;
                                return true;
                            }
                        })
                }

            });
    }
}
_Table = reactive(_Table);

const Dimension = (table) => {
    return new Proxy({}, {
        get(target,property) {
            return target[property] ||= Dimension(table);
        },
        set(target,property,value) {
            if(typeof(value)==="function") {
                const data = {},
                    f = Function("table","data","return () => { with(table) { data.value = (" + value + ")()}}")(table,data);
                target[property] = observer(f);
                target[property].valueOf = () => data.value;
            } else {
                target[property] = value;
            }
            return true;
        }
    })
}

class Cell {
    constructor({compute,value}={}) {
        this.compute = compute;
        this.value = value;
    }
    valueOf() { return this.value; }
}
Cell = reactive(Cell);





