import {reactive} from "../watchlight.js";



test("defineProperty", async () => {
    const object = reactive({person:{name:"joe",age:27}}),
        aPerson = object.person;
    const promise = new Promise((resolve) => {
        aPerson.addEventListener("defineProperty",({type,target,reactor,property,value}) => {
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
    const object = reactive({person:{name:"joe",age:27}}),
        aPerson = object.person;
    const promise = new Promise((resolve) => {
        aPerson.addEventListener("change",({type,target,reactor,property,value,oldValue}) => {
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

test("change - bubble", async () => {
    const object = reactive({person:{name:"joe",age:27}}),
        aPerson = object.person;
    const promise = new Promise((resolve) => {
        object.addEventListener("change",({type,target,currentTarget,reactor,property,value,oldValue}) => {
            expect(target).toBe(aPerson);
            expect(currentTarget).toBe(object);
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

function myDelete({type,target,reactor,property,oldValue}) {
    expect(type).toBe("delete");
    expect(property).toBe("age");
    expect(oldValue).toBe(27);
}

test("delete", () => {
    const object = reactive({person:{name:"joe",age:27}}),
        aPerson = object.person;
    aPerson.addEventListener("delete",myDelete,{synchronous:true});
    delete aPerson.age;
})

test("hasEventListener - function", () => {
    const object = reactive({person:{name:"joe",age:27}}),
        aPerson = object.person;
    aPerson.addEventListener("delete",myDelete,{synchronous:true});
    expect(aPerson.hasEventListener("delete",myDelete)).toBe(true)
})

test("hasEventListener - name", () => {
    const object = reactive({person:{name:"joe",age:27}}),
        aPerson = object.person;
    aPerson.addEventListener("delete",myDelete,{synchronous:true});
    expect(aPerson.hasEventListener("delete","myDelete")).toBe(true)
})

test("hasEventListener - same name", () => {
    const object = reactive({person:{name:"joe",age:27}}),
        aPerson = object.person;
    aPerson.addEventListener("delete",myDelete,{synchronous:true});
    expect(aPerson.hasEventListener("delete",function myDelete() {})).toBe(true)
})

test("removeEventListener",() => {
    const object = reactive({person:{name:"joe",age:27}}),
        aPerson = object.person;
    aPerson.addEventListener("delete",myDelete,{synchronous:true});
    aPerson.removeEventListener("delete","myDelete");
    expect(aPerson.hasEventListener("delete","myDelete")).toBe(false);
    expect(aPerson.hasEventListener("delete",myDelete)).toBe(false);
    expect(aPerson.hasEventListener("delete",function myDelete() {})).toBe(false);
})

test("hasEventListener and removeEventListener - function body",async () => {
    const object = reactive({person:{name:"joe",age:27}}),
        aPerson = object.person;
    aPerson.addEventListener("change",({type,target,reactor,property,value,oldValue}) => {
        expect(target).toBe(aPerson);
        expect(type).toBe("change");
        expect(property).toBe("age");
        expect(value).toBe(30);
        expect(oldValue).toBe(27);
        resolve();
    });
    expect(aPerson.hasEventListener("change",({event,target,reactor,property,value,oldValue}) => {
        expect(event).toBe("change");
        expect(property).toBe("age");
        expect(value).toBe(30);
        expect(oldValue).toBe(27);
        resolve();
    })).toBe(true);
    aPerson.removeEventListener("change",({event,target,reactor,property,value,oldValue}) => {
        expect(event).toBe("change");
        expect(property).toBe("age");
        expect(value).toBe(30);
        expect(oldValue).toBe(27);
        resolve();
    });
    expect(aPerson.hasEventListener("change",({event,target,reactor,property,value,oldValue}) => {
        expect(event).toBe("change");
        expect(property).toBe("age");
        expect(value).toBe(30);
        expect(oldValue).toBe(27);
        resolve();
    })).toBe(false);
})
