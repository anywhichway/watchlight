import {run, not, whilst, assert, reactive} from "../../watchlight.js";

const numberpeople = 100;

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

// create all pairs where each person only exists in one pair
whilst(function pair({person1,person2}) {
    return person1.name!==person2.name &&
       not(Combo(person1,person2),([p1,p2],[existingp1,existingp2]) => p1===existingp1 || p1===existingp2 || p2==existingp1 || p2===existingp2)
},({person1,person2}) => { return {combo:Combo(person1,person2)} }, {person1:Person,person2:Person})
    .then(({combo}) => console.log("A pair!",JSON.stringify(combo)))


for(let i=0;i<numberpeople;i++) {
    assert(Person({name:`name${i}`}));
}

run({trace:{run:true}});