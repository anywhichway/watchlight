import {Observable} from "../Observable.js";

test("defineProperty", async () => {
    const object = Observable({person:{name:"joe",age:27}});
    let aPerson = object.person;
    const promise = new Promise((resolve) => {
        aPerson = aPerson.subscribe(function defineProperty({type,target,reactor,property,value}) {
            expect(type).toBe("defineProperty");
            expect(property).toBe("married");
            expect(value).toBe(true);
            resolve();
        });
    })
    aPerson.married = true;
    return promise;
})

test("change", async () => {
    const object = Observable({person:{name:"joe",age:27}});
    let aPerson = object.person;
    const promise = new Promise((resolve) => {
        aPerson = aPerson.subscribe(function change({type,target,reactor,property,value,oldValue}) {
            expect(target).toBe(aPerson);
            expect(type).toBe("change");
            expect(property).toBe("age");
            expect(value).toBe(30);
            expect(oldValue).toBe(27);
            resolve();
        });
    })
    aPerson.age = 30;
    return promise;
})

test("change - bubble", (done) => {
    const object = Observable({person:{name:"joe",age:27}}),
        aPerson = object.person;
    object.addEventListener("change",({type,target,currentTarget,reactor,property,value,oldValue}) => {
        expect(target).toBe(aPerson);
        expect(currentTarget).toBe(aPerson);
        expect(type).toBe("change");
        expect(property).toBe("age");
        expect(value).toBe(30);
        expect(oldValue).toBe(27);
        done();
    });
    aPerson.age = 30;
})

test("delete", () => {
    const object = Observable({person:{name:"joe",age:27}}),
        aPerson = object.person;
    const promise = new Promise((resolve) => {
        aPerson.addEventListener("delete",({type,target,reactor,property,oldValue}) => {
            expect(type).toBe("delete");
            expect(property).toBe("age");
            expect(oldValue).toBe(27);
            resolve();
        })});
    delete aPerson.age;
    return promise;
})

/*test("hasEventListener - function", () => {
    const object = Observable({person:{name:"joe",age:27}}),
        aPerson = object.person;
    aPerson.addEventListener("delete",myDelete,{synchronous:true});
    expect(aPerson.hasEventListener("delete",myDelete)).toBe(true)
})

test("removeEventListener",() => {
    const object = Observable({person:{name:"joe",age:27}}),
        aPerson = object.person;
    aPerson.addEventListener("delete",myDelete,{synchronous:true});
    aPerson.removeEventListener("delete","myDelete");
    expect(aPerson.hasEventListener("delete","myDelete")).toBe(false);
    expect(aPerson.hasEventListener("delete",myDelete)).toBe(false);
    expect(aPerson.hasEventListener("delete",function myDelete() {})).toBe(false);
})*/


test("custom event",async () => {
    Observable.registerEventType("message");
    const channel = Observable({name:"channelone"}),
        promise = new Promise((resolve) => {
            channel.addEventListener("message",({type,...rest}) => {
                expect(type).toBe("message");
                expect(rest.content).toBe("Hello");
                resolve();
            })
        });
    channel.postMessage("message",{content:"Hello"});
    return promise;
})
