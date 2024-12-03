import "./index.css";
import "../css/animate.min.css";
import "./canvas.js";
import {
  addQipao,
  setPrizes,
  showPrizeList,
  setPrizeData,
  resetPrize
} from "./prizeList";
import { NUMBER_MATRIX } from "./config.js";

const ROTATE_TIME = 10000;
const ROTATE_LOOP = 1000;
// const BASE_HEIGHT = 1080;
const MAX_VISIBLE_CARDS = 119; // 最大可见卡片数

let TOTAL_CARDS,
  btns = {
    enter: document.querySelector("#enter"),
    lotteryBar: document.querySelector("#lotteryBar"),
    lottery: document.querySelector("#lottery")
  },
  prizes,
  EACH_COUNT,
  ROW_COUNT = 7,
  COLUMN_COUNT = 17,
  COMPANY,
  HIGHLIGHT_CELL = [],
  // 当前的比例
  Resolution = 1;

let camera,
  scene,
  renderer,
  controls,
  threeDCards = [],
  targets = {
    table: [],
    sphere: []
  };

let rotateObj;

let selectedUserId = [],
  rotate = false,
  basicData = {
    prizes: [], //奖品信息
    users: [], //所有人员
    luckyUsers: {}, //已中奖人员
    leftUsers: [] //未中奖人员
  },
  // interval,
  // 当前抽的奖项，从最低奖开始抽，直到抽到大奖
  currentPrizeIndex,
  currentPrize,
  // 正在抽奖
  isLotting = false,
  currentLuckys = [],
  allPrizeUserIds = [];

initAll();

/**
 * 初始化所有DOM
 */
function initAll() {
  window.AJAX({
    url: "/getTempData",
    success(data) {
      // 获取基础数据
      prizes = data.cfgData.prizes;
      EACH_COUNT = data.cfgData.EACH_COUNT;
      COMPANY = data.cfgData.COMPANY;
      HIGHLIGHT_CELL = createHighlight();
      basicData.prizes = prizes;
      setPrizes(prizes);

      TOTAL_CARDS = ROW_COUNT * COLUMN_COUNT;
      allPrizeUserIds = []
      // 读取当前已设置的抽奖结果
      basicData.leftUsers = data.leftUsers;
      basicData.luckyUsers = data.luckyData;
      for (let prize in basicData.luckyUsers) {
        const users = basicData.luckyUsers[prize]
        users.forEach(v => {
          allPrizeUserIds.push(v[0])
        })
      }
      // 设置默认抽奖奖项为最后一个未抽完的奖项
      let prizeIndex = basicData.prizes.length - 1;
      for (; prizeIndex > -1; prizeIndex--) {
        if (
          data.luckyData[prizeIndex] &&
          data.luckyData[prizeIndex].length >=
            basicData.prizes[prizeIndex].count
        ) {
          continue;
        }
        currentPrizeIndex = prizeIndex;
        currentPrize = basicData.prizes[currentPrizeIndex];
        break;
      }

      showPrizeList(basicData, currentPrizeIndex, isLotting, callback);
      let curLucks = basicData.luckyUsers[currentPrize.type];
      setPrizeData(currentPrizeIndex, curLucks ? curLucks.length : 0, true);
    }
  });

  window.AJAX({
    url: "/getUsers",
    success(data) {
      basicData.users = data;

      initCards();
      // startMaoPao();
      animate();
      shineCard();
    }
  });
}

function callback(value) {
  currentPrizeIndex = value
  currentPrize = basicData.prizes[currentPrizeIndex]
}

function initCards() {
  let member = basicData.users.slice(),
    // showCards = [],
    length = member.length;

  let isBold = false,
    showTable = basicData.leftUsers.length === basicData.users.length,
    position = {
      x: (140 * 17 - 20) / 2, // 17列
      y: (180 * 7 - 20) / 2   // 7行
    };

  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 3000;

  scene = new THREE.Scene();

  // 使用固定的网格尺寸 17x7
  const gridCols = 17;
  // const gridRows = 7;

  for (let i = 0; i < length; i++) {
    const row = Math.floor(i / gridCols);
    const col = i % gridCols;
    
    isBold = HIGHLIGHT_CELL.includes(col + "-" + row);
    var element = createCard(
      member[i],
      isBold,
      i,
      showTable
    );

    // 超出MAX_VISIBLE_CARDS的卡片默认隐藏
    if (i >= MAX_VISIBLE_CARDS) {
      element.style.display = 'none';
    }

    var object = new THREE.CSS3DObject(element);
    object.position.x = Math.random() * 4000 - 2000;
    object.position.y = Math.random() * 4000 - 2000;
    object.position.z = Math.random() * 4000 - 2000;
    scene.add(object);
    threeDCards.push(object);

    object = new THREE.Object3D();
    object.position.x = col * 140 - position.x;
    object.position.y = -(row * 180) + position.y;
    targets.table.push(object);
  }

  // sphere
  var vector = new THREE.Vector3();

  // 只为前MAX_VISIBLE_CARDS个卡片创建球体位置
  for (var i = 0; i < Math.min(threeDCards.length, MAX_VISIBLE_CARDS); i++) {
    var phi = Math.acos(-1 + (2 * i) / MAX_VISIBLE_CARDS);
    var theta = Math.sqrt(MAX_VISIBLE_CARDS * Math.PI) * phi;
    object = new THREE.Object3D();
    object.position.setFromSphericalCoords(800 * Resolution, phi, theta);
    vector.copy(object.position).multiplyScalar(2);
    object.lookAt(vector);
    targets.sphere.push(object);
  }

  // 为剩余卡片添加空对象以保持数组长度一致
  for (var j = MAX_VISIBLE_CARDS; j < threeDCards.length; j++) {
    targets.sphere.push(new THREE.Object3D());
  }

  renderer = new THREE.CSS3DRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  //

  controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 0.5;
  controls.minDistance = 500;
  controls.maxDistance = 6000;
  controls.addEventListener("change", render);

  bindEvent();

  if (showTable) {
    switchScreen("enter");
  } else {
    switchScreen("lottery");
  }
}

function setLotteryStatus(status = false) {
  isLotting = status;
}

/**
 * 事件绑定
 */
function bindEvent() {
  document.querySelector("#menu").addEventListener("click", function (e) {
    e.stopPropagation();
    // 如果正在抽奖，则禁止一切操作
    if (isLotting) {
      if (e.target.id === "lottery") {
        rotateObj.stop();
        btns.lottery.innerHTML = "开始抽奖";
      } else {
        addQipao("正在抽奖，抽慢一点点～～");
      }
      return false;
    }

    let target = e.target.id;
    switch (target) {
      // 显示数字墙
      case "welcome":
        switchScreen("enter");
        rotate = false;
        break;
      // 进入抽奖
      case "enter":
        removeHighlight();
        addQipao(`马上抽取[${currentPrize.title}],不要走开。`);
        // rotate = !rotate;
        rotate = true;
        switchScreen("lottery");
        break;
      // 重置
      case "reset":
        let doREset = window.confirm(
          "是否确认重置数据，重置后，当前已抽的奖项全部清空？"
        );
        if (!doREset) {
          return;
        }
        addQipao("重置所有数据，重新抽奖");
        addHighlight();
        resetCard();
        // 重置所有数据
        currentLuckys = [];
        basicData.leftUsers = Object.assign([], basicData.users);
        basicData.luckyUsers = {};
        currentPrizeIndex = basicData.prizes.length - 1;
        currentPrize = basicData.prizes[currentPrizeIndex];

        // 重置显示状态
        threeDCards.forEach((card, index) => {
          if (index < MAX_VISIBLE_CARDS) {
            card.element.style.display = '';
          } else {
            card.element.style.display = 'none';
          }
        });

        resetPrize(basicData, currentPrizeIndex, isLotting);
        reset();
        switchScreen("enter");
        break;
      // 抽奖
      case "lottery":
        setLotteryStatus(true);
        // 每次抽奖前先保存上一次的抽奖数据
        // if ()
        //更新剩余抽奖数目的数据显示
        changePrize();
        resetCard().then(() => {
          // 抽奖
          lottery();
        });
        break;
      // 重新抽奖
      case "reLottery":
        if (currentLuckys.length === 0) {
          addQipao(`当前还没有抽奖，无法重新抽取喔~~`);
          return;
        }
        setErrorData(currentLuckys);
        addQipao(`重新抽取[${currentPrize.title}],做好准备`);
        setLotteryStatus(true);
        // 重新抽奖则直接进行抽取，不对上一次的抽奖数据进行保存
        // 抽奖
        resetCard().then(() => {
          // 抽奖
          lottery();
        });
        break;
      // 导出抽奖结果
      case "save":
        // saveData().then(res => {
        //
        // });
        resetCard().then(() => {
          // 将之前的记录置空
          currentLuckys = [];
        });
        exportData();
        addQipao(`数据已保存到EXCEL中。`);
        break;
    }
  });

  window.addEventListener("resize", onWindowResize, false);
}

function switchScreen(type) {
  switch (type) {
    case "enter":
      btns.enter.classList.remove("none");
      btns.lotteryBar.classList.add("none");
      transform(targets.table, 2000);
      break;
    default:
      btns.enter.classList.add("none");
      btns.lotteryBar.classList.remove("none");
      transform(targets.sphere, 2000);
      break;
  }
}

/**
 * 创建元素
 */
function createElement(css, text) {
  let dom = document.createElement("div");
  dom.className = css || "";
  dom.innerHTML = text || "";
  return dom;
}

/**
 * 创建名牌
 */
function createCard(user, isBold, id, showTable) {
  var element = createElement();
  element.id = "card-" + user[0]; // 使用user[0]作为ID

  if (isBold) {
    element.className = "element lightitem";
    if (showTable) {
      element.classList.add("highlight");
    }
  } else {
    element.className = "element";
    element.style.backgroundColor =
      "rgba(0,127,127," + (Math.random() * 0.7 + 0.25) + ")";
  }
  //添加公司标识
  element.appendChild(createElement("company", COMPANY));

  element.appendChild(createElement("name", user[1]));

  element.appendChild(createElement("details", user[0] + "<br/>" + user[2]));
  return element;
}

function removeHighlight() {
  document.querySelectorAll(".highlight").forEach(node => {
    node.classList.remove("highlight");
  });
}

function addHighlight() {
  document.querySelectorAll(".lightitem").forEach(node => {
    node.classList.add("highlight");
  });
}

/**
 * 渲染地球等
 */
function transform(targets, duration) {
  // TWEEN.removeAll();
  for (var i = 0; i < threeDCards.length; i++) {
    var object = threeDCards[i];
    var target = targets[i];

    new TWEEN.Tween(object.position)
      .to(
        {
          x: target.position.x,
          y: target.position.y,
          z: target.position.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: target.rotation.x,
          y: target.rotation.y,
          z: target.rotation.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
  }

  new TWEEN.Tween(this)
    .to({}, duration * 2)
    .onUpdate(render)
    .start();
}

function rotateBall() {
  return new Promise((resolve) => {
    scene.rotation.y = 0;
    rotateObj = new TWEEN.Tween(scene.rotation);
    rotateObj
      .to(
        {
          y: Math.PI * 6 * ROTATE_LOOP
        },
        ROTATE_TIME * ROTATE_LOOP
      )
      .onUpdate(render)
      // .easing(TWEEN.Easing.Linear)
      .start()
      .onStop(() => {
        scene.rotation.y = 0;
        resolve();
      })
      .onComplete(() => {
        resolve();
      });
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();
  controls.update();
}

function render() {
  renderer.render(scene, camera);
}

function selectCard(duration = 600) {
  rotate = false;
  let width = 140,
    height = 180,
    locates = [];

  // 计算布局
  const total = currentLuckys.length;
  
  // 计算最接近正方形的行列数
  let rows = Math.floor(Math.sqrt(total));
  if (total <= 16 && total > 8) {
    rows = 2;
  } else if (total <= 8) {
    rows = 1;
  }
  let cols = Math.ceil(total / rows);
  // 如果最后一行太少，则减少一行使布局更紧凑
  if (total <= rows * (cols - 1)) {
    rows--;
    cols = Math.ceil(total / rows);
  }

  // 根据数量缩放卡片大小
  const scale = total > 25 ? 0.8 : (total > 16 ? 0.9 : 1);
  width *= scale;
  height *= scale;

  // 计算起始位置,使卡片位于屏幕中央
  const startX = -(cols - 1) * width * Resolution / 2;
  const startY = -(rows - 1) * height * Resolution / 2;

  // 生成位置数组
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if ((row * cols + col) >= total) break;
      
      locates.push({
        x: startX + col * width * Resolution,
        y: startY + row * height * Resolution
      });
    }
  }

  let text = currentLuckys.map(item => item[1]).slice(0, 5);
  addQipao(
    `恭喜${text.join("、")} 等 ${currentLuckys.length} 人获得${currentPrize.title}, 新的一年必定旺旺旺。`
  );

  // 根据数量调整z轴间距
  const zGap = total > 25 ? 10 : (total > 16 ? 15 : 20);
  const baseZ = 1200 + zGap + 2500 / total;
  selectedUserId.forEach((userId, index) => {
    let object = threeDCards.find(card => card.element.id === `card-${userId}`);
    if (!object){
      console.log(threeDCards)
      console.log(userId)
    }
    // 显示被抽中的隐藏卡片
    object.element.style.display = '';
    
    changeCard(userId, currentLuckys[index]);

    // 设置缩放
    object.element.style.transform = `scale(${scale})`;
    new TWEEN.Tween(object.position)
      .to(
        {     
          x: locates[index].x,
          y: locates[index].y,
          z: baseZ
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: 0,
          y: 0,
          z: 0
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    object.element.classList.add("prize");
  });

  new TWEEN.Tween(this)
    .to({}, duration * 2)
    .onUpdate(render)
    .start()
    .onComplete(() => {
      // 动画结束后可以操作
      setLotteryStatus();
    });
}

/**
 * 重置抽奖牌内容
 */
function resetCard(duration = 500) {
  if (currentLuckys.length === 0) {
    return Promise.resolve();
  }

  selectedUserId.forEach(userId => {
    let object = threeDCards.find(card => card.element.id === `card-${userId}`),
      index = threeDCards.indexOf(object),
      target = targets.sphere[index];

    // 重置时隐藏超出显示限制的卡片
    if (index >= MAX_VISIBLE_CARDS) {
      object.element.style.display = 'none';
    }

    new TWEEN.Tween(object.position)
      .to(
        {
          x: target.position.x,
          y: target.position.y,
          z: target.position.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: target.rotation.x,
          y: target.rotation.y,
          z: target.rotation.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
  });

  return new Promise((resolve) => {
    new TWEEN.Tween(this)
      .to({}, duration * 2)
      .onUpdate(render)
      .start()
      .onComplete(() => {
        selectedUserId.forEach(userId => {
          let object = threeDCards.find(card => card.element.id === `card-${userId}`);
          object.element.classList.remove("prize");
        });
        resolve();
      });
  });
}

/**
 * 抽奖
 */
function lottery() {

  let perCount = EACH_COUNT[currentPrizeIndex],
    luckyData = basicData.luckyUsers[currentPrize.type],
    leftCount = basicData.leftUsers.length,
    leftPrizeCount = currentPrize.count - (luckyData ? luckyData.length : 0);
  if (leftCount < perCount) {
    addQipao("剩余参与抽奖人员不足，现在重新设置所有人员可以进行二次抽奖！");
    basicData.leftUsers = basicData.users.slice();
    leftCount = basicData.leftUsers.length;
  }
  if (leftPrizeCount <= 0) {
    addQipao("无剩余抽奖名额")
    setLotteryStatus();
    return
  }
  btns.lottery.innerHTML = "结束抽奖";
  addQipao(`正在抽取[${currentPrize.title}],调整好姿势`);

  rotateBall().then(() => {
    // 将之前的记录置空
    currentLuckys = [];
    selectedUserId = [];
    // 当前同时抽取的数目,当前奖品抽完还可以继续抽，但是不记录数据
    for (let i = 0; i < perCount; i++) {
      let lucky = null
      let userIndex = null
      while (true){
        userIndex = random(leftCount);
        lucky = basicData.users.filter((v, index) => index === userIndex)[0];
        if (!allPrizeUserIds.includes(lucky[0])){
          break
        }
      }
      currentLuckys.push(lucky);
      selectedUserId.push(lucky[0]); // 使用user[0]作为ID
      allPrizeUserIds.push(lucky[0]); // 使用user[0]作为ID
      leftCount--;
      leftPrizeCount--;

      if (leftPrizeCount === 0) {
        break;
      }
    }
    selectCard();
    saveData()
  });
}

/**
 * 保存上一次的抽奖结果
 */ ``
function saveData() {
  if (!currentPrize) {
    //若奖品抽完，则不再记录数据，但是还是可以进行抽奖
    return;
  }

  let type = currentPrize.type,
    curLucky = basicData.luckyUsers[type] || [];

  curLucky = curLucky.concat(currentLuckys);

  basicData.luckyUsers[type] = curLucky;

  if (currentPrize.count <= curLucky.length) {
    // 当前奖项已抽完,寻找下一个未抽完的奖项
    let nextIndex = -1;
    for(let i = basicData.prizes.length - 1; i >= 0; i--) {
      const prize = basicData.prizes[i];
      const luckyData = basicData.luckyUsers[prize.type];
      if(!luckyData || luckyData.length < prize.count) {
        nextIndex = i;
        break;
      }
    }
    
    // if(nextIndex === -1) {
    //   addQipao("所有奖项已抽完!");
    //   currentPrizeIndex = basicData.prizes.length - 1;
    // } else {
    //   currentPrizeIndex = nextIndex;
    // }
    // currentPrize = basicData.prizes[currentPrizeIndex];
  }

  if (currentLuckys.length > 0) {
    // todo by xc 添加数据保存机制，以免服务器挂掉数据丢失
    return setData(type, currentLuckys);
  }
  return Promise.resolve();
}

function changePrize() {
  let luckys = basicData.luckyUsers[currentPrize.type];
  let luckyCount = (luckys ? luckys.length : 0) + EACH_COUNT[currentPrizeIndex];
  // 修改左侧prize的数目和百分比
  setPrizeData(currentPrizeIndex, luckyCount);
}

/**
 * 随机抽奖
 */
function random(num) {
  // Math.floor取到0-num-1之间数字的概率是相等的
  return Math.floor(Math.random() * num);
}

/**
 * 切换名牌人员信息
 */
function changeCard(userId, user) {
  let card = threeDCards.find(card => card.element.id === `card-${userId}`).element;

  card.innerHTML = `<div class="company">${COMPANY}</div><div class="name">${
    user[1]
  }</div><div class="details">${user[0] || ""}<br/>${user[2] || "PSST"}</div>`;
}

/**
 * 切换名牌背景
 */
function shine(userId, color) {
  let card = threeDCards.find(card => card.element.id === `card-${userId}`).element;
  card.style.backgroundColor =
    color || "rgba(0,127,127," + (Math.random() * 0.7 + 0.25) + ")";
}

/**
 * 随机切换背景和人员信息
 */
function shineCard() {
  let maxCard = 10,
    maxUser;
  let shineCard = 10 + random(maxCard);

  setInterval(() => {
    // 正在抽奖停止闪烁
    if (isLotting) {
      return;
    }
    maxUser = basicData.leftUsers.length;
    for (let i = 0; i < shineCard; i++) {
      let index = random(maxUser);
      let user = basicData.leftUsers[index];
      // 当前显示的已抽中名单不进行随机切换
      if (selectedUserId.includes(user[0])) {
        continue;
      }
      shine(user[0]);
      changeCard(user[0], user);
    }
  }, 500);
}

function setData(type, data) {
  return new Promise((resolve, reject) => {
    window.AJAX({
      url: "/saveData",
      data: {
        type,
        data
      },
      success() {
        resolve();
      },
      error() {
        reject();
      }
    });
  });
}

function setErrorData(data) {
  return new Promise((resolve, reject) => {
    window.AJAX({
      url: "/errorData",
      data: {
        data
      },
      success() {
        resolve();
      },
      error() {
        reject();
      }
    });
  });
}

function exportData() {
  window.AJAX({
    url: "/export",
    success(data) {
      if (data.type === "success") {
        location.href = data.url;
      }
    }
  });
}

function reset() {
  window.AJAX({
    url: "/reset",
    success() {
      window.location.reload()
      console.log("重置成功");
    }
  });
}

function createHighlight() {
  let year = new Date().getFullYear() + "";
  let step = 4,
    xoffset = 1,
    yoffset = 1,
    highlight = [];

  year.split("").forEach(n => {
    highlight = highlight.concat(
      NUMBER_MATRIX[n].map(item => {
        return `${item[0] + xoffset}-${item[1] + yoffset}`;
      })
    );
    xoffset += step;
  });

  return highlight;
}

let onload = window.onload;

window.onload = function () {
  onload && onload();

  let music = document.querySelector("#music");

  let rotated = 0,
    stopAnimate = false,
    musicBox = document.querySelector("#musicBox");

  function animate() {
    requestAnimationFrame(function () {
      if (stopAnimate) {
        return;
      }
      rotated = rotated % 360;
      musicBox.style.transform = "rotate(" + rotated + "deg)";
      rotated += 1;
      animate();
    });
  }

  musicBox.addEventListener(
    "click",
    function () {
      if (music.paused) {
        music.play().then(
          () => {
            stopAnimate = false;
            animate();
          },
          () => {
            addQipao("背景音乐自动播放失败，请手动播放！");
          }
        );
      } else {
        music.pause();
        stopAnimate = true;
      }
    },
    false
  );

  setTimeout(function () {
    musicBox.click();
  }, 1000);
};
