import {Sheet} from "../sheet.js";

const sheet = Sheet({
    reverse(value) {
        if(value) {
            if(typeof(value.reverse)==="function") return value.reverse();
            if(typeof(value)==="string") return value.split().reverse().join();
        }
    }
});

test("path",() => {
    const sheet = Sheet();
    sheet.tab1.A[2] = sheet.tab1.A[1].path
    expect(sheet.tab1.A[2].valueOf()).toBe("tab1.A.1");
});

test("count",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = () => tab1.A[1] + tab1.A[2] ;
    sheet.tab1.A[4] = "a";
    sheet.tab1.A[5] = "true";
    sheet.tab1.A[6] = () => count(tab1.A);
    expect(sheet.tab1.A[6].valueOf()).toBe(3);
});

test("counta",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = () => tab1.A[1] + tab1.A[2] ;
    sheet.tab1.A[4] = "a";
    sheet.tab1.A[5] = "true";
    sheet.tab1.A[6] = () => counta(tab1.A);
    expect(sheet.tab1.A[6].valueOf()).toBe(5);
});

test("iff",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = true;
    sheet.tab1.A[2] = false;
    sheet.tab1.A[3] = "iftrue";
    sheet.tab1.A[4] = "iffalse";
    sheet.tab1.A[5] = () => iff(tab1.A[1],tab1.A[3],tab1.A[4]);
    sheet.tab1.A[6] = () => iff(tab1.A[2],tab1.A[3],tab1.A[4]);
    expect(sheet.tab1.A[5].valueOf()).toBe("iftrue");
    expect(sheet.tab1.A[6].valueOf()).toBe("iffalse");
});

test("isblank",() => {
    const sheet = Sheet();
    sheet.tab1.A[2] = false;
    sheet.tab1.A[3] = () => isblank(tab1.A[1]);
    sheet.tab1.A[4] = () => isblank(tab1.A[2]);
    expect(sheet.tab1.A[3].valueOf()).toBe(true);
    expect(sheet.tab1.A[4].valueOf()).toBe(false);
});

test("isboolean",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = true;
    sheet.tab1.A[2] = false;
    sheet.tab1.A[3] = "false";
    sheet.tab1.A[4] = () => isboolean(tab1.A[1]);
    sheet.tab1.A[5] = () => isboolean(tab1.A[2]);
    sheet.tab1.A[6] = () => isboolean(tab1.A[3]);
    expect(sheet.tab1.A[4].valueOf()).toBe(true);
    expect(sheet.tab1.A[5].valueOf()).toBe(true);
    expect(sheet.tab1.A[6].valueOf()).toBe(false);
});

test("isdimension",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = false;
    sheet.tab1.A[2] = () => isdimension(tab1);
    sheet.tab1.A[3] = () => isdimension(tab1.A);
    sheet.tab1.A[4] = () => isdimension(tab1.A[1]);
    expect(sheet.tab1.A[2].valueOf()).toBe(true);
    expect(sheet.tab1.A[3].valueOf()).toBe(true);
    expect(sheet.tab1.A[4].valueOf()).toBe(false);
});

test("isempty",() => {
    const sheet = Sheet();
    sheet.tab1.A[2] = "";
    sheet.tab1.A[3] = "test";
    sheet.tab1.A[4] = () => isempty(tab1.A[1]);
    sheet.tab1.A[5] = () => isempty(tab1.A[2]);
    sheet.tab1.A[6] = () => isempty(tab1.A[3]);
    expect(sheet.tab1.A[4].valueOf()).toBe(true);
    expect(sheet.tab1.A[5].valueOf()).toBe(true);
    expect(sheet.tab1.A[6].valueOf()).toBe(false);
});

test("islogical",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = true;
    sheet.tab1.A[2] = false;
    sheet.tab1.A[3] = "false";
    sheet.tab1.A[4] = () => islogical(tab1.A[1]);
    sheet.tab1.A[5] = () => islogical(tab1.A[2]);
    sheet.tab1.A[6] = () => islogical(tab1.A[3]);
    expect(sheet.tab1.A[4].valueOf()).toBe(true);
    expect(sheet.tab1.A[5].valueOf()).toBe(true);
    expect(sheet.tab1.A[6].valueOf()).toBe(false);
});

test("isnumber",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = "";
    sheet.tab1.A[4] = () => isnumber(tab1.A[1]);
    sheet.tab1.A[5] = () => isnumber(tab1.A[2]);
    sheet.tab1.A[6] = () => isnumber(tab1.A[3]);
    expect(sheet.tab1.A[4].valueOf()).toBe(true);
    expect(sheet.tab1.A[5].valueOf()).toBe(false);
    expect(sheet.tab1.A[6].valueOf()).toBeInstanceOf(TypeError);
});

test("isobject",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = {};
    sheet.tab1.A[2] = "";
    sheet.tab1.A[4] = () => isobject(tab1.A[1]);
    sheet.tab1.A[5] = () => isobject(tab1.A[2]);
    sheet.tab1.A[6] = () => isobject(tab1.A[3]);
    expect(sheet.tab1.A[4].valueOf()).toBe(true);
    expect(sheet.tab1.A[5].valueOf()).toBe(false);
    expect(sheet.tab1.A[6].valueOf()).toBeInstanceOf(TypeError);
});

test("isstring",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = "1";
    sheet.tab1.A[2] = 1;
    sheet.tab1.A[4] = () => isstring(tab1.A[1]);
    sheet.tab1.A[5] = () => isstring(tab1.A[2]);
    sheet.tab1.A[6] = () => isstring(tab1.A[3]);
    expect(sheet.tab1.A[4].valueOf()).toBe(true);
    expect(sheet.tab1.A[5].valueOf()).toBe(false);
    expect(sheet.tab1.A[6].valueOf()).toBeInstanceOf(TypeError);
});

test("len",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = "1";
    sheet.tab1.A[2] = [1];
    sheet.tab1.A[4] = () => len(tab1.A[1]);
    sheet.tab1.A[5] = () => len(tab1.A[2]);
    sheet.tab1.A[6] = () => len(tab1.A[3]);
    expect(sheet.tab1.A[4].valueOf()).toBe(1);
    expect(sheet.tab1.A[5].valueOf()).toBe(1);
    expect(sheet.tab1.A[6].valueOf()).toBeInstanceOf(TypeError);
});

test("average",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = 3;
    sheet.tab1.A[4] = () => average([tab1.A,2]);
    expect(sheet.tab1.A[4].valueOf()).toBe(2);
});

test("exp",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 2;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = () => exp(tab1.A[1],tab1.A[2]);
    expect(sheet.tab1.A[3].valueOf()).toBe(4);
});

test("log10",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 2;
    sheet.tab1.A[2] = () => log10(tab1.A[1]);
    expect(sheet.tab1.A[2].valueOf()).toBe(Math.log10(2));
});

test("max",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = 3;
    sheet.tab1.A[4] = () => max([tab1.A,2]);
    sheet.tab1.A[5] = () => max([tab1.A,4]);
    expect(sheet.tab1.A[4].valueOf()).toBe(3);
    expect(sheet.tab1.A[5].valueOf()).toBe(4);
});

test("median",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 4;
    sheet.tab1.A[2] = 1;
    sheet.tab1.A[3] = 7;
    sheet.tab1.A[4] = () => median([tab1.A[1],tab1.A[2],tab1.A[3]]);
    sheet.tab1.A[5] = () => median([tab1.A[1],3,tab1.A[2],tab1.A[3]]);
    expect(sheet.tab1.A[4].valueOf()).toBe(4);
    expect(sheet.tab1.A[5].valueOf()).toBe(3.5);
});

test("min",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = 3;
    sheet.tab1.A[4] = () => min([tab1.A,2]);
    sheet.tab1.A[5] = () => min([tab1.A,0]);
    expect(sheet.tab1.A[4].valueOf()).toBe(1);
    expect(sheet.tab1.A[5].valueOf()).toBe(0);
});

test("product",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = 3;
    sheet.tab1.A[4] = () => product([tab1.A,2]);
    sheet.tab1.A[5] = () => product([tab1.A]);
    expect(sheet.tab1.A[4].valueOf()).toBe(12);
    expect(sheet.tab1.A[5].valueOf()).toBe(72);
});

test("sum",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = 3;
    sheet.tab1.A[4] = () => sum([tab1.A,2]);
    sheet.tab1.A[5] = () => sum([tab1.A]);
    expect(sheet.tab1.A[4].valueOf()).toBe(8);
    expect(sheet.tab1.A[5].valueOf()).toBe(14);
});

test("add",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = () => tab1.A[1] + tab1.A[2];
    expect(sheet.tab1.A[3].valueOf()).toBe(3);
});

test("subtract",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = () => tab1.A[1] - tab1.A[2] ;
    expect(sheet.tab1.A[3].valueOf()).toBe(-1);
});

["acos","acosh","asin","asinh","atan","atan2","cos","cosh","sin","tan","tanh"].forEach((key) => {
    test(key,() => {
        const sheet = Sheet();
        sheet.tab1.A[1] = 45;
        sheet.tab1.A[2] = Function("return " + key + "(tab1.A[1]);");
        expect(sheet.tab1.A[2].valueOf()).toBe(Math[key](45));
    })
})

test("rand",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = () => rand();
    expect(sheet.tab1.A[1].valueOf()).toBeGreaterThanOrEqual(0);
    expect(sheet.tab1.A[1].valueOf()).toBeLessThanOrEqual(1);
})

test("pi",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = () => pi();
    expect(sheet.tab1.A[1].valueOf()).toBe(3.14159265358979);
})

test("int",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = "1.5";
    sheet.tab1.A[3] = "a";
    sheet.tab1.A[4] = () => int(tab1.A[1]);
    sheet.tab1.A[5] = () => int(tab1.A[2]);
    sheet.tab1.A[6] = () => int(tab1.A[3]);
    expect(sheet.tab1.A[4].valueOf()).toBe(1);
    expect(sheet.tab1.A[5].valueOf()).toBe(1);
    expect(sheet.tab1.A[6].valueOf()).toBeNaN();
})

test("float",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = "1.5";
    sheet.tab1.A[3] = "a";
    sheet.tab1.A[4] = () => float(tab1.A[1]);
    sheet.tab1.A[5] = () => float(tab1.A[2]);
    sheet.tab1.A[6] = () => float(tab1.A[3]);
    expect(sheet.tab1.A[4].valueOf()).toBe(1);
    expect(sheet.tab1.A[5].valueOf()).toBe(1.5);
    expect(sheet.tab1.A[6].valueOf()).toBeNaN();
})

test("lower",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = "A";
    sheet.tab1.A[2] = () => lower(tab1.A[1]);
    expect(sheet.tab1.A[2].valueOf()).toBe("a");
})

test("upper",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = "a";
    sheet.tab1.A[2] = () => upper(tab1.A[1]);
    expect(sheet.tab1.A[2].valueOf()).toBe("A");
})

test("value",() => {
    const sheet = Sheet();
    sheet.tab1.A[1] = "1";
    sheet.tab1.A[2] = () => value(tab1.A[1]);
    expect(sheet.tab1.A[2].valueOf()).toBe(1);
})