const MAX_TOP = 300,
  MAX_WIDTH = document.body.clientWidth;

let defaultType = 0;

let prizes;
const DEFAULT_MESS = [
  "我是该抽中一等奖还是一等奖呢，纠结ing...",
  "听说要提前一个月吃素才能中大奖喔！",
  "好想要一等奖啊！！！",
  "一等奖有没有人想要呢？",
  "五等奖也不错，只要自己能中奖就行",
  "祝大家新年快乐！",
  "中不中奖不重要，大家吃好喝好。",
  "新年，祝福大家事事顺遂。",
  "作为专业陪跑的我，我就看看你们有谁跟我一样",
  "新的一年祝福大家越来越好！",
  "来年再战！！！"
];

let lastDanMuList = [];

let prizeElement = {},
  lasetPrizeIndex = 0;
class DanMu {
  constructor(option) {
    if (typeof option !== "object") {
      option = {
        text: option
      };
    }

    this.position = {};
    this.text = option.text;
    this.onComplete = option.onComplete;

    this.init();
  }

  init() {
    this.element = document.createElement("div");
    this.element.className = "dan-mu";
    document.body.appendChild(this.element);

    this.start();
  }

  setText(text) {
    this.text = text || this.text;
    this.element.textContent = this.text;
    this.width = this.element.clientWidth + 100;
  }

  start(text) {
    let speed = ~~(Math.random() * 10000) + 6000;
    this.position = {
      x: MAX_WIDTH
    };
    let delay = speed / 10;

    this.setText(text);
    this.element.style.transform = "translateX(" + this.position.x + "px)";
    this.element.style.top = ~~(Math.random() * MAX_TOP) + 10 + "px";
    this.element.classList.add("active");
    this.tween = new TWEEN.Tween(this.position)
      .to(
        {
          x: -this.width
        },
        speed
      )
      .onUpdate(() => {
        this.render();
      })
      .onComplete(() => {
        this.onComplete && this.onComplete();
      })
      .start();
  }

  render() {
    this.element.style.transform = "translateX(" + this.position.x + "px)";
  }
}

class Qipao {
  constructor(option) {
    if (typeof option !== "object") {
      option = {
        text: option
      };
    }

    this.text = option.text;
    this.onComplete = option.onComplete;
    this.$par = document.querySelector(".qipao-container");
    if (!this.$par) {
      this.$par = document.createElement("div");
      this.$par.className = "qipao-container";
      document.body.appendChild(this.$par);
    }

    this.init();
  }

  init() {
    this.element = document.createElement("div");
    this.element.className = "qipao animated";
    this.$par.appendChild(this.element);

    this.start();
  }

  setText(text) {
    this.text = text || this.text;
    this.element.textContent = this.text;
  }

  start(text) {
    this.setText(text);
    this.element.classList.remove("bounceOutRight");
    this.element.classList.add("bounceInRight");

    setTimeout(() => {
      this.element.classList.remove("bounceInRight");
      this.element.classList.add("bounceOutRight");
      this.onComplete && this.onComplete();
    }, 4000);
  }
}

let addQipao = (() => {
  let qipaoList = [];
  return function (text) {
    let qipao;
    if (qipaoList.length > 0) {
      qipao = qipaoList.shift();
    } else {
      qipao = new Qipao({
        onComplete() {
          qipaoList.push(qipao);
        }
      });
    }

    qipao.start(text);
  };
})();

function setPrizes(pri) {
  prizes = pri;
  defaultType = prizes[0]["type"];
  lasetPrizeIndex = pri.length - 1;
}

function showPrizeList(basicData, currentPrizeIndex, isLotting, callback) {
  let currentPrize = prizes[currentPrizeIndex];
  if (currentPrize.type === defaultType) {
    currentPrize.count === "不限制";
  }
  let htmlCode = `<div class="prize-mess">正在抽取<label id="prizeType" class="prize-shine">${currentPrize.text}</label><label id="prizeText" class="prize-shine">${currentPrize.title}</label>，剩余<label id="prizeLeft" class="prize-shine">${currentPrize.count}</label>个</div><ul class="prize-list">`;
  prizes.forEach((item, index) => {
    if (item.type === defaultType) {
      return true;
    }
    let leftCount = item.count;
    if (basicData && basicData.luckyUsers && basicData.luckyUsers[item.type]) {
      leftCount = item.count - basicData.luckyUsers[item.type].length;
    }
    item.leftCount = leftCount;

    // 计算进度条百分比
    const progressPercent = (leftCount / item.count * 100).toFixed(1);

    htmlCode += `<li id="prize-item-${item.type}" class="prize-item${
      item.type == currentPrize.type ? " shine" : ""
    }" data-index="${index}">
                        <span></span><span></span><span></span><span></span>
                        <div class="prize-img">
                            <img src="${item.img}" alt="${item.title}">
                        </div>
                        <div class="prize-text">
                            <h5 class="prize-title">${item.text} ${
      item.title
    }</h5>
                            <div class="prize-count">
                                <div class="progress">
                                    <div id="prize-bar-${
                                      item.type
                                    }" class="progress-bar progress-bar-danger progress-bar-striped active" style="width: ${progressPercent}%;">
                                    </div>
                                </div>
                                <div id="prize-count-${
                                  item.type
                                }" class="prize-count-left">
                                    ${item.leftCount + "/" + item.count}
                                </div>
                            </div>
                        </div>
                    </li>`;
  });
  htmlCode += `</ul>`;

  document.querySelector("#prizeBar").innerHTML = htmlCode;

  setTimeout(() => {
    const prizeItems = document.querySelectorAll('.prize-item');
    prizeItems.forEach((item, index) => {
      // 直接绑定click事件而不是addEventListener
      item.onclick = function(e) {
        // 移除所有prize-item的高亮
        document.querySelectorAll('.prize-item').forEach(item => {
          item.classList.remove('shine');
        });
        // 给当前点击的prize-item添加高亮
        this.classList.add('shine');

        if(isLotting) {
          addQipao("正在抽奖中，请等待当前抽奖结束...");
          return;
        }

        const prizeIndex = parseInt(this.dataset.index);
        const prize = basicData.prizes[prizeIndex];
        const luckyData = basicData.luckyUsers[prize.type];
        if(luckyData && luckyData.length >= prize.count) {
          addQipao(`${prize.title}已抽完!`);
          return;
        }
        callback(prizeIndex)
        // currentPrizeIndex = prizeIndex;
        currentPrize = prize;
        // showPrizeList(basicData, currentPrizeIndex);

        let curLucks = basicData.luckyUsers[currentPrize.type];
        setPrizeData(prizeIndex, curLucks ? curLucks.length : 0, true);

        addQipao(`正在抽取${prize.title},准备好...`);
      };
    });
  }, 500);
}

function resetPrize(basicData, currentPrizeIndex, isLotting, callback) {
  prizeElement = {};
  lasetPrizeIndex = currentPrizeIndex;
  showPrizeList(basicData, currentPrizeIndex, isLotting, callback);
}

let setPrizeData = (function () {
  return function (currentPrizeIndex, count, isInit) {
    let currentPrize = prizes[currentPrizeIndex],
      type = currentPrize.type,
      elements = prizeElement[type],
      totalCount = currentPrize.count;

    if (!elements) {
      elements = {
        box: document.querySelector(`#prize-item-${type}`),
        bar: document.querySelector(`#prize-bar-${type}`),
        text: document.querySelector(`#prize-count-${type}`)
      };
      prizeElement[type] = elements;
    }

    if (!prizeElement.prizeType) {
      prizeElement.prizeType = document.querySelector("#prizeType");
      prizeElement.prizeLeft = document.querySelector("#prizeLeft");
      prizeElement.prizeText = document.querySelector("#prizeText");
    }

    // if (isInit) {
    //   for (let i = prizes.length - 1; i > currentPrizeIndex; i--) {
    //     let type = prizes[i]["type"];
    //     document.querySelector(`#prize-item-${type}`).className =
    //       "prize-item done";
    //     document.querySelector(`#prize-bar-${type}`).style.width = "0";
    //     document.querySelector(`#prize-count-${type}`).textContent =
    //       "0" + "/" + prizes[i]["count"];
    //   }
    // }

    if (lasetPrizeIndex !== currentPrizeIndex) {
      let lastPrize = prizes[lasetPrizeIndex],
        lastBox = document.querySelector(`#prize-item-${lastPrize.type}`);
      // lastBox.classList.remove("shine");
      // lastBox.classList.add("done");
      // elements.box && elements.box.classList.add("shine");
      prizeElement.prizeType.textContent = currentPrize.text;
      prizeElement.prizeText.textContent = currentPrize.title;

      lasetPrizeIndex = currentPrizeIndex;
    }

    if (currentPrizeIndex === 0) {
      alert("抽奖已结束")
      return
    }
    count = totalCount - count;
    count = count < 0 ? 0 : count;
    let percent = (count / totalCount).toFixed(2);
    elements.bar && (elements.bar.style.width = percent * 100 + "%");
    elements.text && (elements.text.textContent = count + "/" + totalCount);
    prizeElement.prizeLeft.textContent = count;
  };
})();

function startMaoPao() {
  let len = DEFAULT_MESS.length,
    count = 5,
    index = ~~(Math.random() * len),
    danmuList = [],
    total = 0;

  function restart() {
    total = 0;
    danmuList.forEach(item => {
      let text =
        lastDanMuList.length > 0
          ? lastDanMuList.shift()
          : DEFAULT_MESS[index++];
      item.start(text);
      index = index > len ? 0 : index;
    });
  }

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      danmuList.push(
        new DanMu({
          text: DEFAULT_MESS[index++],
          onComplete: function () {
            setTimeout(() => {
              this.start(DEFAULT_MESS[index++]);
              index = index > len ? 0 : index;
            }, 1000);
          }
        })
      );
      index = index > len ? 0 : index;
    }, 1500 * i);
  }
}

function addDanMu(text) {
  lastDanMuList.push(text);
}

export {
  startMaoPao,
  showPrizeList,
  setPrizeData,
  addDanMu,
  setPrizes,
  resetPrize,
  addQipao
};
