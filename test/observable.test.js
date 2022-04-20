import {from,of,subscribe,provide,route,Observable} from "../observable.js"

test("from",() => {
    const result = [];
    from([1,2,3])
        .subscribe((value) => result.push(value));
    expect(result.length).toBe(3);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(2);
    expect(result[2]).toBe(3);
})

test("of",() => {
    const result = [];
    of(1,2,3)
        .subscribe((value) => result.push(value));
    expect(result.length).toBe(3);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(2);
    expect(result[2]).toBe(3);
})

test("route", async () => {
    const results = [],
        observable = Observable()
            .route("/r1",(path) => results.push(path))
            .route(/\/a.*/,(path) => results.push(path))
            .route({name:"joe"},(value) => results.push(value))
            .route({name:"mary"},(object) => object===currentuser ? object : undefined,(object) => results.push(object));
    const p1 = {name:"joe"},
        p2 = {name:"mary"},
        p3 = {name:"mary"},
        currentuser = p3;
    for(const item of ["/r1","/abc",p1,p2,p3]) {
        await provide(item,observable)
    }
    expect(results.length).toBe(4);
    expect(results[0]).toBe("/r1");
    expect(results[1]).toBe("/abc");
    expect(results[2]===p1).toBe(true);
    expect(results[3]===p3).toBe(true);
})
