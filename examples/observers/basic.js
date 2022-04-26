import {Observable,observer} from "../../observable.js";

const user = Observable({name:"mary",contactInfo:{phone:"555-555-5555"}});
const hello = observer(() => {
    console.log("Hello",user.name);
})

const world = Observable({});
observer(function(message) {
    this.user = user.name
    console.log(message,user.name);
},world,"Welcome to the world")
observer(() => {
    if(world.user) console.log(`${world.user} owns the world.`)
})

user.name = "joe";

hello();

observer(() => {
    console.log(JSON.stringify(user)); // recursively accesses every property
})
user.contactInfo.phone = "999-999-9999";