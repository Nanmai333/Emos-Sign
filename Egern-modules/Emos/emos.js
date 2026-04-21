/**
 * emos 自动签到 + Token 获取 (二合一完整版)
 * 适配 Egern / Quantumult X / Loon / Surge
 */

var tokenKey = "emos_best_token";

// ================= 修仙境界体系 =================
var levels = [
    { n: "👤凡人期", max: 9 }, { n: "💨练气期·一层", max: 19 }, { n: "💨练气期·二层", max: 29 },
    { n: "💨练气期·三层", max: 39 }, { n: "💨练气期·四层", max: 49 }, { n: "💨练气期·五层", max: 59 },
    { n: "💨练气期·六层", max: 69 }, { n: "💨练气期·七层", max: 79 }, { n: "💨练气期·八层", max: 89 },
    { n: "💨练气期·九层", max: 99 }, { n: "🏛️筑基期·初期", max: 149 }, { n: "🏛️筑基期·中期", max: 299 },
    { n: "🏛️筑基期·后期", max: 599 }, { n: "🏛️筑基期·圆满", max: 999 }, { n: "💎结丹期·初期", max: 1999 },
    { n: "💎结丹期·中期", max: 3499 }, { n: "💎结丹期·后期", max: 5999 }, { n: "💎结丹期·圆满", max: 9999 },
    { n: "👶元婴期·初期", max: 19999 }, { n: "👶元婴期·中期", max: 34999 }, { n: "👶元婴期·后期", max: 59999 },
    { n: "👶元婴期·圆满", max: 99999 }, { n: "✨化神期", max: 499999 }, { n: "🌌炼虚期", max: 999999 },
    { n: "🔗合体期", max: 9999999 }, { n: "🌟大乘期", max: 99999999 }, { n: "👑真仙期", max: Infinity }
];

function getCultivationInfo(carrot) {
    var min = 0;
    for (var i = 0; i < levels.length; i++) {
        var max = levels[i].max;
        if (carrot <= max) {
            var nextNeed = max === Infinity ? 0 : max - carrot + 1;
            var currentTotal = max === Infinity ? 1 : max - min + 1;
            var currentProgress = carrot - min;
            var ratio = max === Infinity ? 1 : currentProgress / currentTotal;
            var filledCount = Math.floor(ratio * 10);
            var bar = "";
            for (var j = 0; j < 10; j++) { bar += (j < filledCount ? "■" : "□"); }
            return { name: levels[i].n, bar: bar, percent: (ratio * 100).toFixed(1), nextNeed: nextNeed };
        }
        min = max + 1;
    }
    return { name: "未知", bar: "□□□□□□□□□□", percent: "0.0", nextNeed: 0 };
}

// ================= 存储工具适配 =================
function getStorage(key) {
    return (typeof $persistentStore !== "undefined") ? $persistentStore.read(key) : null;
}

function setStorage(val, key) {
    return (typeof $persistentStore !== "undefined") ? $persistentStore.write(val, key) : false;
}

// ================= 主逻辑区分 =================

if (typeof $request !== "undefined" && $request) {
    // ---------- 逻辑 A: 获取 Token (http-request) ----------
    var headers = $request.headers;
    var auth = headers["Authorization"] || headers["authorization"];
    
    if (auth && auth.indexOf("Bearer") !== -1) {
        var newToken = auth.trim();
        var oldToken = getStorage(tokenKey);
        
        if (!oldToken || oldToken !== newToken) {
            if (setStorage(newToken, tokenKey)) {
                $notification.post("emos 签到", "✅ 新 Token 获取成功", "凭证已更新，开始修仙！");
            }
        } else {
            // Token 一致时通常不弹窗，或者仅记录
            console.log("emos: Token 未变化，无需更新");
        }
    }
    $done({});

} else {
    // ---------- 逻辑 B: 自动签到 (schedule) ----------
    var savedToken = getStorage(tokenKey);
    if (!savedToken) {
        $notification.post("emos 签到", "❌ 失败", "未找到 Token，请先登录 emos.best 网页");
        $done();
    } else {
        var signHeaders = {
            "Authorization": savedToken,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X)"
        };

        // 步骤 1：获取用户信息
        $httpClient.get({ url: "https://emos.best/api/user", headers: signHeaders }, function(err, resp, data) {
            if (err || resp.status !== 200) {
                $notification.post("emos 签到", "❌ 网络错误", "无法连接服务器获取资料");
                $done();
                return;
            }
            
            try {
                var uObj = JSON.parse(data);
                var today = new Date().toISOString().substring(0, 10);
                var isSignedToday = (uObj.sign && uObj.sign.sign_at && uObj.sign.sign_at.indexOf(today) !== -1);

                if (isSignedToday) {
                    var lv = getCultivationInfo(uObj.carrot);
                    var msg = "👨‍🌾 重复修仙 明天再修💪\n";
                    msg += "修为: [" + lv.name + "] " + uObj.carrot + " 🥕\n";
                    msg += "进度: [" + lv.bar + "] " + lv.percent + "%\n";
                    msg += (lv.nextNeed > 0 ? "🎯 破境还需: " + lv.nextNeed + " 🥕" : "👑 已达极境！");
                    $notification.post("emos 签到", "✨ 仙途长青", msg);
                    $done();
                } else {
                    // 步骤 2：执行签到 (从环境变量读取文案，默认为滴滴打卡)
                    var signContent = (typeof $env !== "undefined" && $env.read("SIGN_CONTENT")) || "滴滴打卡";
                    $httpClient.put({
                        url: "https://emos.best/api/user/sign?content=" + encodeURIComponent(signContent),
                        headers: signHeaders
                    }, function(sErr, sResp, sData) {
                        if (sResp && sResp.status === 200) {
                            var resObj = JSON.parse(sData);
                            var newCarrot = (uObj.carrot || 0) + resObj.earn_point;
                            var lvNow = getCultivationInfo(newCarrot);
                            
                            var msg = "🥕 签到成功！获得: +" + resObj.earn_point + " 🥕\n";
                            msg += "连签: " + resObj.continuous_days + "天 | 修为: " + newCarrot + "\n";
                            msg += "境界: [" + lvNow.name + "]\n";
                            msg += "进度: [" + lvNow.bar + "] " + lvNow.percent + "%\n";
                            msg += (lvNow.nextNeed > 0 ? "🎯 破境还需: " + lvNow.nextNeed + " 🥕" : "👑 已至巅峰");
                            
                            $notification.post("emos 签到", "✅ 突破成功", msg);
                        } else {
                            $notification.post("emos 签到", "⚠️ 签到失败", "服务器拒绝了请求或已签过");
                        }
                        $done();
                    });
                }
            } catch (e) {
                $notification.post("emos 签到", "❌ 脚本异常", "数据解析失败");
                $done();
            }
        });
    }
}
