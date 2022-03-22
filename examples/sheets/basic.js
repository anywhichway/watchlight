import {Sheet} from "../../Sheet.js";

const sheet = Sheet();
sheet.A[1] = 1; // dimensions and cells are created automatically
sheet.A[2] = 1;
sheet.A[3] = () => A[1] + A[2]; // Note, there is no need to include sheet; watchlight manages the resolution
sheet.A[3].withFormat("$${this.valueOf().toFixed(2)}");
sheet.A[4] = 1;
sheet.B[1] = () => sum(values(A,2,3));
sheet.B[2] = () => sum(A);
console.log(sheet.B[1].valueOf()); // logs 3
console.log(sheet.B[2].valueOf()); // logs 5
console.log(sheet.A[3].valueOf()); // logs 2
console.log(sheet.A[3].format()); // logs $2.00
sheet.A[2] = 2;
console.log(sheet.A[3].valueOf()); // logs 3

sheet[1][2][1] =  () => {
    return A[3] + 1
}; // completely different dimension approach
console.log(sheet[1][2][1].valueOf()); // logs 4
sheet.A[2] = 4;
setTimeout(() => { // let recalculation settle out
    console.log(sheet.A[3].valueOf()); // logs 5
    console.log(sheet.A[3].format()); // logs $5.00
    console.log(sheet[1][2][1].valueOf()); // logs 6
    console.log(sheet.B[1].valueOf()); // logs 9
})