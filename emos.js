/**
 * emos 整合脚本 (Egern 增强通知版)
 * 逻辑：捕获 Token (Rewrite) + 自动签到 (Cron)
 */

const tokenKey = "emos_best_token";

// ================= 模式 1: 获取参数 (重写模式) =================
if (typeof $request !== "undefined") {
    const auth = $request.headers["Authorization"] || $request.headers["authorization"];
    if (auth && auth.indexOf("Bearer") !== -1) {
        const newToken = auth.trim();
        const oldToken = $persistentStore.read(tokenKey);
        
        // 只要进入这个逻辑，就一定会发通知（用于排查不执行的问题）
        if (oldToken !== newToken) {
            $persistentStore.write(newToken, tokenKey);
            $notification.post("emos 获取参数", "✅ 捕获成功", "检测到新 Token，已更新凭证。");
        } else {
            $notification.post("emos 获取参数", "ℹ️ 凭证核对", "Token 已存在且一致，无需重复获取。");
        }
    }
    $done({}); // 重写模式必须调用 $done 结束
} 

// ================= 模式 2: 自动签到 (定时模式) =================
else {
    const savedToken = $persistentStore.read(tokenKey);
    if (!savedToken) {
        $notification.post("emos 签到", "❌ 失败", "本地无 Token，请先登录网页触发获取逻辑。");
        $done();
    } else {
        // --- 修仙境界体系 ---
        const levels = [{ n: "👤凡人期", max: 9 }, { n: "💨练气期·一层", max: 19 }, { n: "💨练气期·二层", max: 29 }, { n: "💨练气期·三层", max: 39 }, { n: "💨练气期·四层", max: 49 }, { n: "💨练气期·五层", max: 59 }, { n: "💨练气期·六层", max: 69 }, { n: "💨练气期·七层", max: 79 }, { n: "💨练气期·八层", max: 89 }, { n: "💨练气期·九层", max: 99 }, { n: "🏛️筑基期·初期", max: 149 }, { n: "🏛️筑基期·中期", max: 299 }, { n: "🏛️筑基期·后期", max: 599 }, { n: "🏛️筑基期·圆满", max: 999 }, { n: "💎结丹期·初期", max: 1999 }, { n: "💎结丹期·中期", max: 3499 }, { n: "💎结丹期·后期", max: 5999 }, { n: "💎结丹期·圆满", max: 9999 }, { n: "👶元婴期·初期", max: 19999 }, { n: "👶元婴期·中期", max: 34999 }, { n: "👶元婴期·后期", max: 59999 }, { n: "👶元婴期·圆满", max: 99999 }, { n: "✨化神期", max: 499999 }, { n: "🌌炼虚期", max: 999999 }, { n: "🔗合体期", max: 9999999 }, { n: "🌟大乘期", max: 99999999 }, { n: "👑真仙期", max: Infinity }];
        const getLv = (c) => {
            let min = 0;
            for (let l of levels) {
                if (c <= l.max) {
                    let ratio = l.max === Infinity ? 1 : (c - min) / (l.max - min + 1);
                    let bar = "■".repeat(Math.floor(ratio * 10)).padEnd(10, "□");
                    return { n: l.n, bar: bar, per: (ratio * 100).toFixed(1) };
                }
                min = l.max + 1;
            }
        };

        const headers = { "Authorization": savedToken, "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" };
        
        // 执行签到
        $httpClient.get({ url: "https://emos.best/api/user", headers: headers }, (err, resp, data) => {
            if (err) {
                $notification.post("emos 签到", "❌ 网络错误", "无法连接服务器");
                $done();
                return;
            }
            try {
                const u = JSON.parse(data);
                const today = new Date().toISOString().split('T')[0];
                if (u.sign && u.sign.sign_at && u.sign.sign_at.includes(today)) {
                    const lv = getLv(u.carrot);
                    $notification.post("emos 签到", "✨ 仙途长青", `境界: [${lv.n}]\n修为: ${u.carrot} 🥕\n进度: [${lv.bar}] ${lv.per}%`);
                    $done();
                } else {
                    const argTxt = (typeof $argument !== "undefined" && $argument.comment) ? $argument.comment : "签到,我要🥕";
                    $httpClient.put({ url: `https://emos.best/api/user/sign?content=${encodeURIComponent(argTxt)}`, headers: headers }, (sErr, sResp, sData) => {
                        const res = JSON.parse(sData);
                        const info = getLv(u.carrot + (res.earn_point || 0));
                        $notification.post("emos 签到", "✅ 突破成功", `获得: +${res.earn_point} 🥕\n当前境界: ${info.n}`);
                        $done();
                    });
                }
            } catch (e) {
                $notification.post("emos 签到", "❌ 错误", "数据解析异常");
                $done();
            }
        });
    }
}
