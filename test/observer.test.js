import {Observable,observer,unobserve} from "../observable.js";

test("change",() => {
    const person = Observable({name:"joe"}),
        result = {},
        o = observer(() => {
            const name = person.name;
            if(name!==undefined) {
                result.name = name;
            }
        });
    person.name = "mary"
    expect(result.name).toBe("mary");
})

test("unobserve",() => {
    const person = Observable({name:"joe"}),
        result = {},
        o = observer(() => {
            const name = unobserve(() => person.name);
            if(name!==undefined) {
                result.name = name;
            }
        });
    person.name = "mary"
    expect(result.name).toBe("joe");
});

test("chain",() => {
    const person = Observable({name:"joe"}),
        next = Observable({}),
        result = {},
        o1 = observer(() => {
            const name = person.name;
            if(name!==undefined) {
                next.name = name;
            }
        }),
        o2 = observer(() => {
            const name = next.name;
            if(name!==undefined) {
                result.name = name;
            }
        });
    person.name = "mary";
    expect(next.name).toBe("mary");
    expect(result.name).toBe("mary");
})

test("stop",() => {
    const person = Observable({name:"joe"}),
        next = Observable({}),
        result = {},
        o1 = observer(() => {
            const name = person.name;
            if(name!==undefined) {
                next.name = name;
            }
        }),
        o2 = observer(() => {
            const name = next.name;
            if(name!==undefined) {
                result.name = name;
            }
        });
    o2.stop();
    person.name = "mary";
    expect(next.name).toBe("mary");
    expect(result.name).toBe("joe");
})


test("stop - start",() => {
    const person = Observable({name:"joe"}),
        next = Observable({}),
        result = {},
        o1 = observer(() => {
            const name = person.name;
            if(name!==undefined) {
                next.name = name;
            }
        }),
        o2 = observer(() => {
            const name = next.name;
            if(name!==undefined) {
                result.name = name;
            }
        });
    o2.stop();
    o2.start();
    person.name = "mary";
    expect(next.name).toBe("mary");
    expect(result.name).toBe("mary");
})





