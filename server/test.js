const fs = require("fs");

// 测试抽奖结果数据的正确性
var selected = {},
  repeat = [],
  luckyData = require("./cache/temp.json"),
  errorData = require("./cache/error.json");

for (let key in luckyData) {
  let item = luckyData[key];
  item.forEach(user => {
    let id = user[0];
    if (selected[id]) {
      repeat.push(user[1]);
      return;
    }
    selected[id] = true;
  });
}

errorData.forEach(user => {
  let id = user[0];
  if (selected[id]) {
    repeat.push(user[1]);
    return;
  }
  selected[id] = true;
});

if (repeat.length > 0) {
  console.log(repeat);
  return;
}
console.log("没有重复选项");
