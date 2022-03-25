import {reactive,observer,unobserve} from "../watchlight.js";

test("change",() => {
    const person = reactive({name:"joe"}),
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
    const person = reactive({name:"joe"}),
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
    const person = reactive({name:"joe"}),
        next = reactive({}),
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
    const person = reactive({name:"joe"}),
        next = reactive({}),
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
    const person = reactive({name:"joe"}),
        next = reactive({}),
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





