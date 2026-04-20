/**
 * emos 整合脚本 (Egern 专用)
 * 1. 捕获 Token 并发送成功/重复通知 (源自: emos获取参数.js)
 * 2. 自动化签到并展示修仙境界 (源自: emos签到.js)
 */

var key = "emos_best_token";

// ================= 1. 获取参数逻辑 (HTTP Request 触发) =================
if (typeof $request !== "undefined" && $request) {
    var headers = $request.headers;
    if (headers) {
        var auth = headers["Authorization"] || headers["authorization"];
        if (auth && auth.indexOf("Bearer") !== -1) {
            var newToken = auth.trim();
            try {
                // 读取旧 Token 进行对比
                var oldToken = $persistentStore.read(key);
                
                if (!oldToken || oldToken !== newToken) {
                    $persistentStore.write(newToken, key);
                    // 弹出成功通知
                    $notification.post("emos 签到", "✅ 新 Token 获取成功", "凭证已更新，开始修仙！");
                } else {
                    // 弹出重复通知
                    $notification.post("emos 签到", "ℹ️ 重复 Token 提醒", "凭证一致，无需重复操作。");
                }
            } catch (e) {
                console.log("emos 存储异常: " + e.message);
            }
        }
    }
    $done({});
} 

// ================= 2. 自动化签到逻辑 (Cron 触发) =================
else {
    // 修仙境界体系
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
                var ratio = max === Infinity ? 1 : (carrot - min) / (max - min + 1);
                var bar = "■".repeat(Math.floor(ratio * 10)).padEnd(10, "□");
                return { name: levels[i].n, bar: bar, percent: (ratio * 100).toFixed(1), nextNeed: nextNeed };
            }
            min = max + 1;
        }
        return { name: "未知", bar: "□□□□□□□□□□", percent: "0.0", nextNeed: 0 };
    }

    var savedToken = $persistentStore.read(key);
    if (!savedToken) {
        $notification.post("emos 签到", "❌ 失败", "未找到 Token，请先登录网页触发获取");
        $done();
    } else {
        var headers = {
            "Authorization": savedToken,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0"
        };

        $httpClient.get({ url: "https://emos.best/api/user", headers: headers }, function(err, resp, data) {
            if (err) { $done(); return; }
            try {
                var uObj = JSON.parse(data);
                var today = new Date().toISOString().substring(0, 10);
                var isSigned = (uObj.sign && uObj.sign.sign_at && uObj.sign.sign_at.indexOf(today) !== -1);

                if (isSigned) {
                    var lv = getCultivationInfo(uObj.carrot);
                    var msg = "👨‍🌾 重复修仙 明天再修💪\n" + "修为: [" + lv.name + "] " + uObj.carrot + " 🥕";
                    $notification.post("emos 签到", "✨ 仙途长青", msg);
                    $done();
                } else {
                    $httpClient.put({
                        url: "https://emos.best/api/user/sign?content=" + encodeURIComponent("滴滴打卡"),
                        headers: headers
                    }, function(sErr, sResp, sData) {
                        var resObj = JSON.parse(sData);
                        var lvNow = getCultivationInfo(uObj.carrot + (resObj.earn_point || 0));
                        $notification.post("emos 签到", "✅ 突破成功", "获得: +" + resObj.earn_point + " 🥕\n境界: " + lvNow.name);
                        $done();
                    });
                }
            } catch (e) { $done(); }
        });
    }
}
