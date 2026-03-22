console.log("getting an error in the printer service")
const printer = require("./printer.service");

printer.printReceipt("Hello World", "EPSON TM-T20II Receipt Printer");
