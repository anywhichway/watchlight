import {assert, reactive, run, when} from "../../watchlight.js"

// translated from https://en.wikipedia.org/wiki/Jess_(programming_language)#Code_examples

class BloodDonor {
    constructor({name,type}) {
        this.name = name;
        this.type = type;
    }
}
BloodDonor = reactive(BloodDonor);

when(function sameTypeButNotSelf({donor1,donor2}) {
    return donor2.type === donor1.type && donor2.name !== donor1.name;
},{donor1:BloodDonor,donor2:BloodDonor})
    .then(({donor1,donor2}) => {
        console.log(`donor ${donor1.name} can give blood to ${donor2.name}`)
    })
when(function OtoOthersButNotSelf({donor1,donor2}) {
    return donor1.type === "O" && donor2.type !== donor1.type && donor2.name !== donor1.name;
},{donor1:BloodDonor,donor2:BloodDonor})
    .then(({donor1,donor2}) => {
        console.log(`donor ${donor1.name} can give blood to ${donor2.name}`)
    })
when(function AorBtoABButNotSelf({donor1,donor2}) {
    return (donor1.type === "A" || donor1.type === "B") && donor2.type === "AB" && donor2.name !== donor1.name;
},{donor1:BloodDonor,donor2:BloodDonor})
    .then(({donor1,donor2}) => {
        console.log(`donor ${donor1.name} can give blood to ${donor2.name}`)
    })

assert(BloodDonor({name:"Alice",type:"A"}));
assert(BloodDonor({name:"Agatha",type:"A"}));
assert(BloodDonor({name:"Bob",type:"B"}));
assert(BloodDonor({name:"Barbara",type:"B"}));
assert(BloodDonor({name:"Jess",type:"AB"}));
assert(BloodDonor({name:"Karen",type:"AB"}));
assert(BloodDonor({name:"Onan",type:"O"}));
assert(BloodDonor({name:"Osbert",type:"O"}));

run({trace:{run:true}});



