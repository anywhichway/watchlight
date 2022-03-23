import {Sheet} from "../sheet.js";

const sheet = Sheet({
    reverse(value) {
        if(value) {
            if(typeof(value.reverse)==="function") return value.reverse();
            if(typeof(value)==="string") return value.split().reverse().join();
        }
    }
})

test("count",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = () => tab1.A[1] + tab1.A[2] ;
    sheet.tab1.A[4] = "a";
    sheet.tab1.A[5] = "true";
    sheet.tab1.A[6] = () => count(tab1.A);
    expect(sheet.tab1.A[6].valueOf()).toBe(3);
})

test("counta",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = () => tab1.A[1] + tab1.A[2] ;
    sheet.tab1.A[4] = "a";
    sheet.tab1.A[5] = "true";
    sheet.tab1.A[6] = () => counta(tab1.A);
    expect(sheet.tab1.A[6].valueOf()).toBe(5);
})

test("iff",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = true;
    sheet.tab1.A[2] = false;
    sheet.tab1.A[3] = "iftrue";
    sheet.tab1.A[4] = "iffalse";
    sheet.tab1.A[5] = () => iff(tab1.A[1],tab1.A[3],tab1.A[4]);
    sheet.tab1.A[6] = () => iff(tab1.A[2],tab1.A[3],tab1.A[4]);
    expect(sheet.tab1.A[5].valueOf()).toBe("iftrue");
    expect(sheet.tab1.A[6].valueOf()).toBe("iffalse");
})

test("isblank",async () => {
    const sheet = Sheet();
    sheet.tab1.A[2] = false;
    sheet.tab1.A[3] = () => isblank(tab1.A[1]);
    sheet.tab1.A[4] = () => isblank(tab1.A[2]);
    expect(sheet.tab1.A[3].valueOf()).toBe(true);
    expect(sheet.tab1.A[4].valueOf()).toBe(false);
})

test("isboolean",async () => {
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
})

test("isdimension",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = false;
    sheet.tab1.A[2] = () => isdimension(tab1);
    sheet.tab1.A[3] = () => isdimension(tab1.A);
    sheet.tab1.A[4] = () => isdimension(tab1.A[1]);
    expect(sheet.tab1.A[2].valueOf()).toBe(true);
    expect(sheet.tab1.A[3].valueOf()).toBe(true);
    expect(sheet.tab1.A[4].valueOf()).toBe(false);
})

test("isempty",async () => {
    const sheet = Sheet();
    sheet.tab1.A[2] = "";
    sheet.tab1.A[3] = "test";
    sheet.tab1.A[4] = () => isempty(tab1.A[1]);
    sheet.tab1.A[5] = () => isempty(tab1.A[2]);
    sheet.tab1.A[6] = () => isempty(tab1.A[3]);
    expect(sheet.tab1.A[4].valueOf()).toBe(true);
    expect(sheet.tab1.A[5].valueOf()).toBe(true);
    expect(sheet.tab1.A[6].valueOf()).toBe(false);
})

test("islogical",async () => {
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
})

test("isnumber",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = "";
    sheet.tab1.A[4] = () => isnumber(tab1.A[1]);
    sheet.tab1.A[5] = () => isnumber(tab1.A[2]);
    sheet.tab1.A[6] = () => isnumber(tab1.A[3]);
    expect(sheet.tab1.A[4].valueOf()).toBe(true);
    expect(sheet.tab1.A[5].valueOf()).toBe(false);
    expect(sheet.tab1.A[6].valueOf()).toBeInstanceOf(TypeError);
})

test("isobject",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = {};
    sheet.tab1.A[2] = "";
    sheet.tab1.A[4] = () => isobject(tab1.A[1]);
    sheet.tab1.A[5] = () => isobject(tab1.A[2]);
    sheet.tab1.A[6] = () => isobject(tab1.A[3]);
    expect(sheet.tab1.A[4].valueOf()).toBe(true);
    expect(sheet.tab1.A[5].valueOf()).toBe(false);
    expect(sheet.tab1.A[6].valueOf()).toBeInstanceOf(TypeError);
})

test("isstring",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = "1";
    sheet.tab1.A[2] = 1;
    sheet.tab1.A[4] = () => isstring(tab1.A[1]);
    sheet.tab1.A[5] = () => isstring(tab1.A[2]);
    sheet.tab1.A[6] = () => isstring(tab1.A[3]);
    expect(sheet.tab1.A[4].valueOf()).toBe(true);
    expect(sheet.tab1.A[5].valueOf()).toBe(false);
    expect(sheet.tab1.A[6].valueOf()).toBeInstanceOf(TypeError);
})

test("len",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = "1";
    sheet.tab1.A[2] = [1];
    sheet.tab1.A[4] = () => len(tab1.A[1]);
    sheet.tab1.A[5] = () => len(tab1.A[2]);
    sheet.tab1.A[6] = () => len(tab1.A[3]);
    expect(sheet.tab1.A[4].valueOf()).toBe(1);
    expect(sheet.tab1.A[5].valueOf()).toBe(1);
    expect(sheet.tab1.A[6].valueOf()).toBeInstanceOf(TypeError);
})

test("average",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = 3;
    sheet.tab1.A[4] = () => average([tab1.A,2]);
    expect(sheet.tab1.A[4].valueOf()).toBe(2);
})

test("exp",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 2;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = () => exp(tab1.A[1],tab1.A[2]);
    expect(sheet.tab1.A[3].valueOf()).toBe(4);
})

test("log10",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 2;
    sheet.tab1.A[2] = () => log10(tab1.A[1]);
    expect(sheet.tab1.A[2].valueOf()).toBe(Math.log10(2));
})

test("max",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = 3;
    sheet.tab1.A[4] = () => max([tab1.A,2]);
    sheet.tab1.A[5] = () => max([tab1.A,4]);
    expect(sheet.tab1.A[4].valueOf()).toBe(3);
    expect(sheet.tab1.A[5].valueOf()).toBe(4);
})

test("median",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 4;
    sheet.tab1.A[2] = 1;
    sheet.tab1.A[3] = 7;
    sheet.tab1.A[4] = () => median([tab1.A[1],tab1.A[2],tab1.A[3]]);
    sheet.tab1.A[5] = () => median([tab1.A[1],3,tab1.A[2],tab1.A[3]]);
    expect(sheet.tab1.A[4].valueOf()).toBe(4);
    expect(sheet.tab1.A[5].valueOf()).toBe(3.5);
})

test("min",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = 3;
    sheet.tab1.A[4] = () => min([tab1.A,2]);
    sheet.tab1.A[5] = () => min([tab1.A,0]);
    expect(sheet.tab1.A[4].valueOf()).toBe(1);
    expect(sheet.tab1.A[5].valueOf()).toBe(0);
})

test("add",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = () => tab1.A[1] + tab1.A[2];
    expect(sheet.tab1.A[3].valueOf()).toBe(3);
})
test("subtract",async () => {
    const sheet = Sheet();
    sheet.tab1.A[1] = 1;
    sheet.tab1.A[2] = 2;
    sheet.tab1.A[3] = () => tab1.A[1] - tab1.A[2] ;
    expect(sheet.tab1.A[3].valueOf()).toBe(-1);
})