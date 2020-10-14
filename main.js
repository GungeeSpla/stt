// based on https://github.com/emaame/salmonrun_time_timer

function init () {
	window.stTimerApp = new StTimerApp().startApp();
	if (! window.queries.overlay) {
		$(window).bind("orientationchange resize", function () {
			fitWindow();
			setTimeout(fitWindow, 250);
			setTimeout(fitWindow, 500);
			setTimeout(fitWindow, 1000);
		}).trigger("resize");
		setTimeout(function(){
			$("#mask").css("opacity", "0");
		},200);
		setTimeout(function(){
			$("#mask").remove();
		},1000);
	} else {
		$("#mask").remove();
		var align = window.queries.textalign ? window.queries.textalign : "center";
		$(".st_eta").css("text-align", align);
		var color = window.queries.textcolor ? "#" + window.queries.textcolor : "#000";
		$(".st_eta").css("color", color);
		if (window.queries.countonly === "1") {
			$(".st_eta_description").hide();
			$(".st_eta_next").hide();
		}
		if (window.queries.textdeco === "shadow") {
			$(".st_eta").addClass("shadow_" + window.queries.textcolor);
		}
		if (window.queries.textdeco === "border") {
			$(".st_eta").addClass("border_" + window.queries.textcolor);
		}
	}
	$("body").css("display", "block");
}


//# StTimerApp ()
function StTimerApp (stTitle, firstSt, stInterval) {
	var app = this;
	
	this.stTitle       = window.queries.title ? decodeURIComponent(window.queries.title) : "ST";
	this.stTimer       = new StTimer(app, firstSt, stInterval);
	this.sound         = new StSound(app);
	this.dateFormatter = new DateFormatter();
	this.isFreeSound   = false;
	this.errorTimerId = null;
	this.list        = [];
	
	this.bEta        = 0;
	this.eta         = 0;
	this.nowDate     = null;
	this.etaDate     = null;
	this.bStageIndex = null;
	this.stageFrame  = 0;
	this.stageCounts = [0, 5, 10, 30, 60].map(time => time *= 1000);
	this.lastStageIndex = this.stageCounts.length - 1;
	this.stageIndex     = this.lastStageIndex;
	this.isClearing  = false;
	this.framePerSec   = 60;
	this.loopTimerId   = -1;
	this.loopDuration  = 1000 / this.framePerSec;
	this.updateSttId       = -1;
	this.updateSttDuration = 60 * 1000;
	this.updateOffsetId       = -1;
	this.updateOffsetDuration = 60 * 60 * 1000;
	this.storageKey    = "st_timer_gungee_stt";
	
	//## setStTitle ()
	this.setStTitle = function () {
		var str;
		// フレ部屋モード用の文字列
		var friend = this.stTimer.timeOffset.enableFriendOffset ? "（フレ部屋）" : "";
		// STの時刻をずらしているとき用の文字列
		var sign = app.stTimer.stOffset >= 0 ? "+" : "";
		var offset = app.stTimer.stOffset ? sign + app.stTimer.stOffset + "分" : "";
		// 文字列の決定
		if (this.stTitle !== "ST") {
			offset = "";
		}
		str = this.stTitle + "<span style=''>" + offset + friend + "</span>まで";
		if (window.queries.overlay) {
			str = this.stTitle + offset + friend + "まで残り";
		}
		// 文字列を放り込む
		this.$description.html(str);
	};
	
	//## getJqueryObject ()
	this.getJqueryObject = function () {
		this.$allWrapper  = $(".all_wrapper");
		this.$eta         = $(".st_eta_count");
		this.$next        = $(".st_eta_next");
		this.$canvas      = $(".st_eta_canvas");
		this.ctx          = this.$canvas[0].getContext("2d");
		this.$checkSound  = $("#check_sound");
		this.$checkFriend = $("#check_friend");
		this.$friendPlus  = $(".friend_plus_button");
		this.$friendMinus = $(".friend_minus_button");
		this.$friendOffset= $(".friend_offset");
		this.$stWrapper   = $(".st_eta");
		this.$correction  = $(".st_eta_correction");
		this.$description = $(".st_eta_description");
		this.$soundTest   = $(".sound_test_button");
		this.$soundDesc   = $(".st_eta_sound_desc");
		this.$settingVolumePlus  = $(".st_setting_volume_plus");
		this.$settingVolumeMinus = $(".st_setting_volume_minus");
		this.$settingVolumeMute  = $(".st_setting_volume_mute");
		this.$settingVolumeSpan  = $(".st_setting_volume_span");
		this.$settingVolume      = $(".st_setting_volume_plus, .st_setting_volume_minus");
		var clickEvent    = "ontouchstart" in window ? "touchstart" : "click";
		
		//## 音量の調節
		this.$settingVolume.each(function(){
			var $this = $(this);
			var move = parseFloat($this.attr("move"));
			$this.on(clickEvent, function (e) {
				activeButton(this);
				app.sound.volume = app.sound.volume + move;
				app.sound.volume = Math.round(app.sound.volume * 10) / 10;
				app.sound.volume = Math.max(0, Math.min(1, app.sound.volume));
				app.$settingVolume.render();
				app.save();
				app.sound.play("switch");
				return false;
			});
		});
		this.$settingVolume.render = function () {
			var isMuted = app.sound.isMuted;
			/*
			if (isMuted) {
				hide(app.$settingVolumePlus);
				hide(app.$settingVolumeMinus);
			}
			else if (app.sound.volume == 0) {
				show(app.$settingVolumePlus);
				hide(app.$settingVolumeMinus);
			}
			else if (app.sound.volume == 1) {
				hide(app.$settingVolumePlus);
				show(app.$settingVolumeMinus);
			}
			else {
				show(app.$settingVolumePlus);
				show(app.$settingVolumeMinus);
			}
			*/
			show(app.$settingVolumePlus);
			show(app.$settingVolumeMinus);
			var percent = (app.sound.volume * 100).toFixed(0);
			var text = percent + "%";
			if (isMuted) {
				text = "Muted";
			}
			app.$settingVolumeSpan.text(text);
			function show ($self) {
				$self.removeClass("st_hidden");
			}
			function hide ($self) {
				$self.addClass("st_hidden");
			}
		};
		this.$settingVolume.render();
		
		//## サウンドテスト
		this.$soundTest.on(clickEvent, function (e) {
			e.preventDefault();
			activeButton(this);
			app.sound.play("manmenmi");
			return false;
		});
		
		//## サウンドの有効化
		if (! app.isFreeSound) {
			this.$checkSound.on(clickEvent, function (e) {
				if (! app.isFreeSound) {
					//app.sound.playSilent();
					app.sound.testPlaySilent();
					app.isFreeSound = true;
					console.log("✅ サウンドの再生制限を解除しました.");
					app.$soundDesc.css("display", "block");
					app.$canvas.css("display", "none");
					setTimeout(function(){
						app.$soundDesc.fadeOut(1000, function(){
							app.$canvas.css("display", "inline-block");
						});
					}, 8000);
				}
				$(this).off(clickEvent);
			});
		}
		
		//## サウンドのオンオフ		
		this.$checkSound.on("change", function (e) {
			var isChecked = $(this).prop("checked");
			if (isChecked) {
				app.$soundTest.removeClass("hidden_button");
				app.sound.isEnabled = true;
				app.$settingVolumePlus.removeClass("hidden_button");
				app.$settingVolumeMinus.removeClass("hidden_button");
				if (! e.isTrigger) app.sound.play("switch");
			}
			else {
				app.$soundTest.addClass("hidden_button");
				if (! e.isTrigger) app.sound.play("switch");
				app.sound.isEnabled = false;
				app.$settingVolumePlus.addClass("hidden_button");
				app.$settingVolumeMinus.addClass("hidden_button");
			}
			if (! e.isTrigger) app.save();
			app.setStTitle();
			return false;
		});
		
		//## * checkFriend
		this.$checkFriend.on("change", function (e) {
			var isChecked = $(this).prop("checked");
			if (isChecked) {
				app.stTimer.timeOffset.enableFriendOffset = true;
				app.$stWrapper.addClass("st_friend_mode");
				$(".correction_friend").remove();
				var str = "フレンド部屋用に %dif 秒の補正をしています";
				    str = str.replace("%dif", Math.abs(app.stTimer.timeOffset.friendOffset / 1000));
				var $p = $("<p></p>").text(str).addClass("correction_friend");
				//app.$correction.append($p);
				app.$friendPlus.removeClass("hidden_button");
				app.$friendMinus.removeClass("hidden_button");
			}
			else {
				app.stTimer.timeOffset.enableFriendOffset = false;
				$(".correction_friend").remove();
				app.$stWrapper.removeClass("st_friend_mode");
				app.$friendPlus.addClass("hidden_button");
				app.$friendMinus.addClass("hidden_button");
			}
			var num = app.stTimer.timeOffset.friendOffset / 1000;
			app.$friendOffset.text(num.toFixed(1));
			if (! e.isTrigger) app.save();
			app.setStTitle();
			if (! e.isTrigger) app.sound.play("switch");
			return false;
		});
		//## * friendPlus
		this.$friendPlus.on(clickEvent, function (e) {
			e.preventDefault();
			activeButton(this);
			app.stTimer.timeOffset.friendOffset += 100;
			app.save();
			var num = app.stTimer.timeOffset.friendOffset / 1000;
			app.$friendOffset.text(num.toFixed(1));
			app.sound.play("click");
			return false;
		});
		//## * friendMinus
		this.$friendMinus.on(clickEvent, function (e) {
			e.preventDefault();
			activeButton(this);
			app.stTimer.timeOffset.friendOffset -= 100;
			app.save();
			var num = app.stTimer.timeOffset.friendOffset / 1000;
			app.$friendOffset.text(num.toFixed(1));
			app.sound.play("click");
			return false;
		});
		
		function activeButton (self) {
			var $self = $(self);
			$self.addClass("button_active");
			setTimeout(function () {
				$self.removeClass("button_active");
			}, 100);
		}
	};
	
	//## calcEta ()
	// 残りカウントを計算します
	this.calcEta = function () {
		var now      = this.stTimer.timeOffset.getTime();
		var next     = this.list[0];
		this.bEta    = this.eta;
		this.eta     = next - now;
		this.etaDate = new Date(this.eta);
		this.nowDate = new Date(now);
		this.etaMin  = this.etaDate.getMinutes();
		this.etaSec  = this.etaDate.getSeconds() + 1;
		this.etaMsec = this.etaDate.getMilliseconds() + 1;
	};
	
	//## updateCountStage ()
	// stageIndexを更新します
	this.updateCountStage = function () {
		// 直前のstageIndexを保存
		this.bStageIndex = this.stageIndex;
		// 現在のstageIndexを特定
		for (var i = this.lastStageIndex; i >= 0; i--) {
			var stageCount = this.stageCounts[i];
			if (this.eta >= stageCount) break;
		}
		// this.etaがマイナスのときはi=-1となる→lastStageIndexに転換
		if (i < 0) i = this.lastStageIndex;
		this.stageIndex = i;
		// 直前のstageIndexと現在のstageIndexが違う＝stageIndexが変わった瞬間には
		// 特殊な処理を行う
		if (this.bStageIndex != null && this.bStageIndex != this.stageIndex) {
			this.stageFrame = 0;
			switch (this.stageIndex) {
			case 0: // 残り5秒以内
				if (true || document.hasFocus && document.hasFocus()) app.sound.play("54321");
				else app.sound.play("5");
				break;
			case 1: // 残り10秒以内
				app.sound.play("10");
				break;
			case 2: // 残り30秒以内
				app.sound.play("30");
				break;
			case 3: // 残り60秒以内
				app.sound.play("60");
				break;
			case this.lastStageIndex: // 残り60秒以上
				this.isClearing = true;
				this.updateStList();
				app.sound.play("manmenmi");
				break;
			}
		}
	};
	
	//## update ()
	// 情報の更新
	this.update = function () {
		// 残り時間の計算
		this.calcEta();
		// stageIndexの更新
		this.updateCountStage();
		var sign = app.stTimer.stOffset >= 0 ? "+" : "";
		var offset = (this.stTitle === "ST" && app.stTimer.stOffset) ? sign + app.stTimer.stOffset + "分" : "";
		var str = this.stTitle + offset;
		document.title = str + "まで " + this.dateFormatter.getMinText2(this.etaDate);
	};
	
	//## setCtx ()
	this.setCtx = function () {
		this.ctxWidth         = 100;
		this.ctxHeight        = 100;
		this.ctxRadius        = 40;
		this.ctxFontSize      = 34;
		this.ctxFontFamily    = "'メイリオ', sans-serif";
		this.ctxCx            = this.ctxWidth / 2;
		this.ctxCy            = this.ctxHeight / 2;
		this.ctxArcStart      = Math.PI * (-1/2);
		this.ctxArcRound      = - Math.PI * 2;
		this.ctx.fillStyle    = "#FFFFFF";
		this.ctx.strokeStyle  = "#FFFFFF";
		this.ctx.lineWidth    = 8;
		this.ctx.lineCap      = "butt";
		this.ctx.font         = "bold " + this.ctxFontSize + "px " + this.ctxFontFamily;
		this.ctx.textAlign    = "center";
		this.ctx.textBaseline = "middle";
	};
	
	//## render ()
	// 画面を描画する関数です
	this.render = function () {
		//if (window.queries.seconly) var getMinText = app.dateFormatter.getMinText2;
		//else getMinText = app.dateFormatter.getMinText;
		var str = app.dateFormatter.getMinText(this.etaDate);
		var str2 = app.dateFormatter.getMinText2(this.etaDate);
		this.$eta.html((this.etaDate.getMinutes() >= 1) ? str2 : str);
		this.clearCanvas();
		// ゼロのフェードアウトを描画
		if (this.stageIndex == this.lastStageIndex) {
			if (this.stageFrame < this.framePerSec && this.isClearing) {
				this.ctx.globalAlpha = 1 - this.stageFrame / this.framePerSec;
				this.renderCountdown(1, true, "0");
			}
			else this.isClearing = false;
		}
		// 残り10～0秒のカウントサークルを表示
		else if (this.stageIndex <= 1) {
			this.ctx.globalAlpha = 1;
			var progress = this.etaMsec / 1000;
			var isClockwise = (this.etaSec % 2 == 0);
			this.renderCountdown(progress, isClockwise, this.etaSec);
		}
		this.stageFrame++;
	};
	
	//## renderOffset (json)
	this.renderOffset = function (json) {
		var str = (json.dif > 0) ?
		          "端末の %dif 秒の遅れを補正済み":
		          "端末の %dif 秒の進みを補正済み";
		    str = str.replace("%dif", Math.abs(json.dif / 1000).toFixed(3));
		var $p = $("<p></p>").text(str).addClass("correction_dif");
		this.$correction.empty();
		this.$correction.append($p);
	};
	
	//## clearCanvas ()
	// Canvasをクリアします
	this.clearCanvas = function () {
		this.ctx.clearRect(0, 0, this.ctxWidth, this.ctxHeight);
	};
	
	//## renderCountdown (progress, isClockwise, sec)
	// Canvasにカウントダウンサークルを描画します
	this.renderCountdown = function (progress, isClockwise, sec) {
		// サークルの描画
		this.ctx.beginPath();
		this.ctx.arc(this.ctxCx, this.ctxCy, this.ctxRadius,
		  this.ctxArcStart, this.ctxArcStart + this.ctxArcRound * progress, !isClockwise);  
		this.ctx.stroke();
		// テキストの描画
		this.ctx.fillText(sec, this.ctxCx, this.ctxCy);
	};
	
	//## loop ()
	// ループ関数です
	this.loop = function () {
		//console.log("looping.");
		// 次回を予約
		clearTimeout(app.loopTimerId);
		app.loopTimerId = setTimeout(app.loop, app.loopDuration);
		// アップデートと描画
		app.update();
		app.render();
	};
	
	//## updateStList ()
	// STリストを更新します
	this.updateStList = function () {
		console.log("✅ STリストを更新しました.");
		// 次回を予約
		clearTimeout(app.updateSttId);
		app.updateSttId = setTimeout(app.updateStList, app.updateSttDuration);
		// リストを更新
		app.list = app.stTimer.listupNextSTT();
		// 文字を更新
		var date = app.dateFormatter.getMonthText(app.list[0]);
		var str = "%date までのカウントダウンを表示しています";
		if (window.queries.overlay) {
			str = "<span class='hunbyo'>次は</span>%dateに出発!";
		}
		    str = str.replace("%date", date);
		app.$next.html(str);
	};
	
	//## updateOffset ()
	this.updateOffset = function () {
		// 次回を予約
		clearTimeout(app.updateOffsetId);
		app.updateOffsetId = setTimeout(app.updateOffset, app.updateOffsetDuration);
		// NICTにアクセス
		setTimeout(() => {
  		app.stTimer.timeOffset.getOffsetJST(function(json){
  			app.stTimer.timeOffset.offsetJST = json.dif;
  			app.updateStList();
  			app.renderOffset(json);
  		});
    }, 500);
	};
	
	//## save ()
	this.save = function () {
		var saveData = {
			isEnabledSound: this.sound.isEnabled,
			volume        : this.sound.volume,
			friendOffset  : this.stTimer.timeOffset.friendOffset
		};
		var saveDataStr = JSON.stringify(saveData);
		localStorage.setItem(this.storageKey, saveDataStr);
	};
	
	//## load ()
	this.load = function () {
		var saveDataStr = localStorage.getItem(this.storageKey);
		if (saveDataStr) {
			var saveData = JSON.parse(saveDataStr);
			var defaultData = {
				isEnabledSound: false,
				volume        : 0.5,
				friendOffset  : 2500
			};
			saveData = $.extend({}, defaultData, saveData);
			this.sound.volume = saveData.volume;
			this.sound.isEnabled = saveData.isEnabledSound;
			this.stTimer.timeOffset.friendOffset = saveData.friendOffset;
			this.$checkSound.prop("checked", this.sound.enable).trigger("change");
			this.$checkFriend.trigger("change");
			this.$settingVolume.render();
		}
	};
	
	//## startApp ()
	this.startApp = function () {
		// jQueryオブジェクトを取得する
		this.getJqueryObject();
		// Canvasのcontextの設定を行う
		this.setCtx();
		// STのタイトルを設定する
		this.setStTitle();
		// STリストを作成
		this.updateStList();
		// 音声のプリロード
		this.sound.loadAll();
		// NICTにアクセス
		setTimeout(this.updateOffset, 100);
		/*
		this.stTimer.errorTimerId = setTimeout(function() {
			$('.st_eta_correction p').text('現在NICTサーバが利用できないため、時差が修正できません。');
		}, 5000);
		*/
		// ロード
		this.load();
		// ループスタート
		this.loop();
		return this;
	};
	
	return this;
}





//# DateFormatter ()
function DateFormatter () {
	
	this.ketasu = window.queries.ketasu ? parseInt(window.queries.ketasu) : 1;
	this.hunbyo = window.queries.hunbyo ? (window.queries.hunbyo === "1") : false; 
	
	this.wrap = function (str) {
	  return '<span class="hunbyo">'+str+'</span>';
	};
	this.g = this.wrap("月");
	this.n = this.wrap("日");
	this.j = this.wrap("時");
	this.h = this.wrap("分");
	this.b = this.wrap("秒");
	
	//## getMonthText (d)
	this.getMonthText = function (d) {
		d.MM = (d.getMonth() + 1);
		d.DD = d.getDate();
		d.hh = d.getHours();
		d.mm = ("00" + d.getMinutes()).slice(-2);
		d.ss = ("00" + d.getSeconds()).slice(-2);
		if (this.hunbyo) {
		  return d.hh + this.j + d.mm + this.h;
		} else {
		  return d.hh + ":" + d.mm;
		}
		// 12/31 23:59:59
	};
	
	//## getMinText (d)
	this.getMinText = function (d) {
		d.mm  = d.getMinutes();
		d.ss  = ("00" + d.getSeconds()).slice(-2);
		switch (this.ketasu) {
		case 3:
			d.SSS = "." + ("000" + Math.floor(d.getMilliseconds()/  1)).slice(-3);
			break;
		case 2:
			d.SSS = "." + ("00"  + Math.floor(d.getMilliseconds()/ 10)).slice(-2);
			break;
		case 1:
			d.SSS = "." + ("0"   + Math.floor(d.getMilliseconds()/100)).slice(-1);
			break;
		default:
			d.SSS = "";
		  break;
		}
		if (this.hunbyo) {
		  return (d.mm + this.h + d.ss + "<span class='hunbyo2'>" + d.SSS + "</span>" + this.b);
		} else {
		  return (d.mm + ":" + d.ss + "<span class='hunbyo2'>" + d.SSS + "</span>");
		}
		// 59:59.999
	};
	
	//## getMinText2 (d)
	this.getMinText2 = function (d) {
	  d = new Date(d.getTime() + 1000);
		d.mm  = ("00" + d.getMinutes()).slice(-2);
		d.ss  = ("00" + d.getSeconds()).slice(-2);
		if (this.hunbyo) {
		  return (d.mm + this.h + d.ss + this.b);
		} else {
		  return (d.mm + ":" + d.ss);
		}
		// 59:59
	};
	
	return this;
}




//# StTimer ()
function StTimer (app, firstSt, stInterval) {
	var self = this;
	
	this.app              = app;
	this.firstSt          = firstSt || 2;
	this.interval         = stInterval || 8;
	this.timeOffset       = new TimeOffset(this);
	this.stOffset         = parseInt(queries.offset) || 0;
	this.offsetSec        = 0;
	this.isEnableStOffset = true;
	
	//## listupNextSTT (intTime)
	this.listupNextSTT = function (intTime) {
		var list = [];
			
		var queries    = window.queries || {};
		var stOffset   = this.isEnableStOffset ? this.stOffset : 0;
		var firstSt    = parseInt(queries.firstSt)    || this.firstSt;
		    firstSt   += stOffset;
		var interval   = parseInt(queries.STinterval) || this.interval;
		var a          = Math.max(0, interval - firstSt);
		var numPerHour = Math.floor((59 - firstSt - a) / interval) + 1;
		
		var base;
		if (intTime) base = new Date(intTime);
		else base = new Date(this.timeOffset.getTime());
		
		// 現在のピリオドを取得
		// いま0-1分なら第0ピリオド、いま2-9分なら第1ピリオド…となる（第8ピリオドまで）
		// | period  |   0   |            1            | 2  ...  6 |            7            |   8   |
		// | minutes | 00 01 | 02 03 04 05 06 07 08 09 | 10 ... 49 | 50 51 52 53 54 55 56 57 | 58 59 |
		var period = Math.floor((base.getMinutes() - firstSt) / interval) + 1;
		
		// 現在の時間を取得
		var hours = base.getHours();
			
		while (list.length < numPerHour) {
			// ピリオドを増やしながらlistにpushしていく
			// 第7ピリオド以降はこのfor文は実行されない
			// listが7件埋まっているならばこのfor文は実行されな
			for (var i = period; i < numPerHour && list.length < numPerHour; ++i) {
				var minutes = firstSt + i * interval;
				var d = new Date(base);
				d.setHours(hours);
				d.setMinutes(minutes);
				d.setSeconds(this.offsetSec);
				d.setMilliseconds(0);
				list.push( d );
			}
			// ピリオドのリセットと時間の増加
			period = 0;
			hours += 1;
		}
		
		// list.map(st => console.log("- " + this.app.dateFormatter.getMonthText(st)) );
		return list;
	};
	
	return this;
}





//# TimeOffset
function TimeOffset (stTimer) {
	var self = this;
	this.stTimer = stTimer;
	this.resulat = {};
	this.offsetJST = 0;
	this.streamOffset = window.queries.streamoffset ? parseFloat(window.queries.streamoffset) * 1000 : 0;
	this.enableFriendOffset = false;
	this.friendOffset = 2500;
	this.serverUrls            = [
		"https://ntp-a1.nict.go.jp/cgi-bin/json",
		"https://ntp-b1.nict.go.jp/cgi-bin/json",
		"https://ntp-a4.nict.go.jp/cgi-bin/json"
	];
	
	//## getJqueryObject ()
	this.getJqueryObject = function () {
	};
	
	//## getTime ()
	this.getTime = function () {
		var time = new Date().getTime();
		var offset = this.offsetJST;
		// 配信のラグを考慮して、視聴者が見たときちょうどよくなるようにするために、時間を早くする
		if (this.streamOffset) offset += this.streamOffset;
		// フレンド部屋はマッチングが早く行われるので、時間を遅くする
		if (this.enableFriendOffset) offset -= this.friendOffset;
		return time + offset;
	};
	
	//## consoleOffset (json)
	this.consoleOffset = function (json) {
		console.log("✅ NICTサーバにアクセスしました.");
	};
	
	//## results
	this.results = [];
	
	//## getOffsetJST ()
	this.getOffsetJST = function (callback) {
	  var that = this;
	  this.results = [];
	  var minLength = 3;
	  var index = (this.results.length < minLength) ? 0 : undefined;
	  var _callback = function (json) {
		if (index === 0) {
		  callback(json);
		}
		if (that.results.length < minLength) {
		  if (!isNaN(index)) {
			index += 1;
		  }
		  setTimeout(() => {
			that.getOffsetJSTOnce(index, _callback);
		  }, 1000);
		} else {
			that.results.sort(function(a, b) {
			  return a.dif - b.dif;
			});
			if (minLength < 3) {
				var dif = that.results[0].dif;
				console.log('時差: ' + (dif / 1000).toFixed(3));
				that.offsetJST = dif;
				that.stTimer.app.renderOffset({
				  dif: dif
				});
			} else {
				var difSum = 0;
				var difNum = 0;
				var difAvg;
				var difStr = '';
				for (var i = 0; i < that.results.length; i++) {
				  if (i > 0) {
					difStr += ' / ';
				  }
				  difStr += (that.results[i].dif / 1000).toFixed(3);
				  if (i > 0 && i < that.results.length - 1) {
					difNum++;
					difSum += that.results[i].dif;
				  }
				}
				difAvg = Math.floor(difSum / difNum);
				console.log('時差: ' + difStr);
				console.log('最小と最大を除いた平均時差: ' + difAvg);
				that.offsetJST = difAvg;
				that.stTimer.app.renderOffset({
				  dif: difAvg
				});
			}
		}
	  }
	  this.getOffsetJSTOnce(index, _callback);
	}
	
	//## getOffsetJSTOnce ()
	this.getOffsetJSTOnce = function (index, callback) {
		var that = this;
		// アクセスするサーバーをランダムに決定し
		// ユニークなクエリパラメータを付けてキャッシュを防ぐ
		var randomIndex = isNaN(index) ? Math.floor(Math.random() * 3) : index % 3; // 0, 1, 2
		var randomServerUrl = this.serverUrls[randomIndex];
		var uniqueQuery = "?" + ((new Date()).getTime() / 1000);
		// GET
		$.get(randomServerUrl + uniqueQuery, function (json) {
  			clearTimeout(that.stTimer.errorTimerId);
			// StringだったらJSONでオブジェクトにする
			if (typeof json == "string") json = JSON.parse(json);
			// オブジェクトが正常に取得でいていれば
			if( json && json.st && json.it && json.leap && json.next && json.step ) {
				json.rt = new Date().getTime();   // 受信時刻
				json.it = Number(json.it) * 1000; // 発信時刻
				json.st = Number(json.st) * 1000; // サーバ時刻
				json.rtt = json.rt - json.it;     // 応答時間
				json.dif = json.st - (json.it + json.rt) / 2; // JST - PC Clock
				json.dif = Math.round(json.dif);
				console.log('発信から受信まで' + (json.rtt / 1000).toFixed(3) + '秒');
				console.log('端末の時刻はサーバー[' + randomIndex + ']時刻に比べて' + (json.dif / 1000).toFixed(3) + '秒' + ((json.dif > 0) ? '遅れ' : '進み'));
				// 結果の格納
				that.result = json;
				that.results.push(json);
				that.offsetJST = json.dif;
				// 結果の表示
				that.consoleOffset(json);
				callback(json);
			}
			else {
				console.log("✖ JSTの取得でエラーが発生しました.");
			}
		});
	};
	
	//## getOffsetJST (callback)
	this.getOffsetJST = function (callback) {
		// クライアントのDate
		var clientDate = new Date();
		var clientTime = clientDate.getTime();
		var dif = 0;
		// このHTMLファイルをHTTP通信で読み込んで'X-Timer'ヘッダーの値を確認する
		$.ajax({
			type : 'HEAD',
			url :  window.location.href,
			cache : false
		}).done(function(data, textStatus, xhr) {
			try {
				// 'X-Timer'ヘッダーの値を取り出す
				var xtimer = xhr.getResponseHeader('X-Timer'); // 'S1602674787.604632,VS0,VE180'
				// UNIXタイムスタンプを数値型で取り出す
				xtimer = parseFloat(xtimer.split(',')[0].replace(/[^0-9|.]/g,'')); // 1602674787.604632
				// 小数部分を取り出す
				var milliseconds = parseFloat('0.' + String(xtimer).split('.')[1] || 0); // 0.604632
				// 小数部分が0.5以上のとき整数部分が1大きくなる仕様があるので修正する
				if (milliseconds >= 0.5) {
					xtimer -= 1; // 1602674786.604632
				}
				// JavaScriptはUNIXタイムスタンプをミリ秒単位で扱うので1000倍する
				var serverTime = xtimer * 1000; // 1602674786604.632
				// この時点でのクライアントのDateを取って平均したほうがよいか
				var clientDate2 = new Date();
				var clientTime2 = clientDate2.getTime();
				var clientAvgTime = (clientTime + clientTime2) / 2;
				dif = serverTime - clientAvgTime;
			} catch(e) {
				return callback({ dif });
			}
			callback({ dif });
		}).fail(function() {
			callback({ dif });
		});
	}
	
	this.getJqueryObject();
	return this;
}







/*
 * @ref https://github.com/GoogleChromeLabs/airhorn/blob/master/app/scripts/main.min.js
 */

//# StSound ()
function StSound (app) {
	var self = this;
	
	this.app          = app;
	this.isEnabled    = false;
	this.soundUrlBase = "./sounds/";
	this.soundUrls    = [
		"5",
		"10",
		"30",
		"60",
		"54321",
		"switch",
		"manmenmi",
		"click"
	];
	
	// 初期化
	this.volume  = 0.8;
	this.isMuted = false;
	this.sources = new Array(this.soundUrls.length);
	this.buffers = new Array(this.soundUrls.length);
	this.playing = new Array(this.soundUrls.length, false);
	this.audioContext = (window.AudioContext || window.webkitAudioContext);
	this.noAudioContext = false;
	this.fallbackAudio = document.createElement("audio");
	this.isTested = false;
	
	// AudioContextが使用可能ならそのコンテキストを使う
	if (this.audioContext !== undefined) {
		this.audioCtx = new this.audioContext();
		this.audioCtx.createGain = this.audioCtx.createGain || this.audioCtx.createGainNode;
	}
	
	// AudioContextが使用不可ならば<audio>エレメントを使う
	else {
		this.noAudioContext = true;
	}
	
	//## loadAll ()
	this.loadAll = function () {
		return Promise.all(this.soundUrls.map((v, index, a) =>
			this._load(index)
				.then((buffer) => {
					if (! buffer) return;
					this.buffers[index] = buffer;
				}))).then(function () {
					console.log("✅ 音声データをすべてプリロードしました.");
				});
	};
	
	//## playSilent ()
	this.playSilent = function () {
		// 無音のBufferを生成して再生する
		// iOSやChromeのサウンド再生制限の解除に用いる
		this.audioCtx.resume();
		var buf = this.audioCtx.createBuffer(1, 1, 22050);
		var src = this.audioCtx.createBufferSource();
		src.buffer = buf;
		src.connect(this.audioCtx.destination);
		src.start(0);
	};
	
	//## testPlay ()
	this.testPlay = function () {
		this.isTested = true;
		var audio = document.getElementById("sound_switch");
		audio.volume = this.volume;
		audio.currentTime = 0;
		audio.play();
	};
	
	//## testPlaySilent ()
	this.testPlaySilent = function () {
		this.isTested = true;
		var audio = document.getElementById("sound_silent");
		audio.volume = this.volume;
		audio.currentTime = 0;
		audio.play();
	};
	
	
	//## filename2index (filename)
	this.filename2index = function (filename) {
		
		// filenameが文字列じゃなければfilenameをそのまま返す
		if (typeof filename != "string") return filename;
		
		// soundUrlsの中をサーチ
		var idx = this.soundUrls.indexOf(filename);
		
		// 見つかったらそれを返す
		if (idx > -1) {
			return idx;
		}
		
		// 見つからなかったら
		else {
			// filenameに".mp3"を加えてもう一度サーチし
			// その結果を返す（これでも見つからなければ-1が返る）
			return this.soundUrls.indexOf(filename + ".mp3");
		}
	};
	
	//## defaultOpt
	// play()のデフォルトオプションを新設
	this.defaultOpt = {
		volume: 1,
		loop: false
	};
	
	//## play (index)
	this.play = function (index, opt) {
		
		// サウンドが無効なら即return
		if (! this.isEnabled) return;
		
		// オプションをデフォルトオプションに統合する
		opt = $.extend({}, this.defaultOpt, opt);
		
		// indexが文字列（＝ファイル名）だった場合にそれを真のindexに変換する
		index = this.filename2index(index);
		
		// indexが0未満ならば何もできない
		if (index < 0) return ;
		
		// _loadを呼び出してbufferの準備ができたら
		return this._load(index).then(buffer => {
			
			// AudioContextがなければfallbackを実行
			if (this.noAudioContext) {
				this.fallbackAudio.volume = this.volume;
				this.fallbackAudio.currentTime = 0;
				this.fallbackAudio.play();
				return;
			}
			
			// AudioContextを再開する
			this.audioCtx.resume();
			
			// AudioBufferSourceNodeを生成するが
			var source = this.audioCtx.createBufferSource();
			
			// なんかfalseになっちゃったら何もできない
			if (! source) return;

			// GainNodeを生成（音量の調節）
			var gainNode = this.audioCtx.createGain();
			var volume = this.volume * opt.volume;
			if (this.isMuted) volume = 0;
			gainNode.gain.value = volume;

			// SourceNodeにループ設定を加える
			source.loop = opt.loop;
			
			// SourceNodeにbufferを代入する
			source.buffer = buffer;
			
			// SourceNode - GainNode - AudioContext.destinationの経路で接続する
			source.connect(gainNode);
			gainNode.connect(this.audioCtx.destination);
			
			// 再生が終わったら
			// 注1: ループ再生の場合はonendedは呼ばれない。また
			// 注2: 外部からstopをかけられた場合も呼ばれる
			source.onended = function () {
				this.stop(index);
			};
			
			// フラグを立てる
			this.sources[index] = source;
			this.playing[index] = true;
			
			// 再生を開始する
			source.start(0);
		});
	};
	
	//## stop (index)
	this.stop = function (index) {
		
		// indexが文字列（＝ファイル名）だった場合にそれを真のindexに変換する
		index = this.filename2index(index);
		
		// indexが0未満ならば何もできない
		if (index < 0) return ;
		
		// playing配列のindex番目にアクセスしフラグを折る
		this.playing[index] = false;
		
		// ソースがあればストップをかける
		if (this.sources[index]) {
			this.sources[index].stop(0);
		}
		
		// AudioContextがなければfallbackを実行
		if (this.noAudioContext) {
			this.fallbackAudio.pause();
		}
	}
	
	//## stopAll ()
	// 再生中のすべての音声を停止する
	this.stopAll = function () {
		for (var i = 0; i < this.playing.length; i++) {
			if (this.playing[i]) {
				this.stop(i);
			}
		}
	};
	
	//## _load (index)
	this._load = function (index) {
		
		// urlを決定
		// indexは数値でなければならない
		var url = this.soundUrlBase + this.soundUrls[index];
		
		// urlに.mp3が含まれるなら何もしない
		if (url.lastIndexOf(".mp3") > -1) ;
		
		// .mp3が含まれないなら.wavを足す
		else url += ".wav";
		
		// AudioContextがなければfallbackを実行
		if (this.noAudioContext) {
			this.fallbackAudio.src = url;
			return new Promise((resolve, reject) => {
				resolve(null);
			});
		}
		
		// AudioContextを再開する
		this.audioCtx.resume();
		
		// まずはキャッシュをチェックする
		var buffer = this.buffers[index];
		
		// キャッシュにあればそれを返せばいい
		if (!! buffer == true) {
			return new Promise((resolve, reject) => {
				resolve(buffer);
			});
		}
		
		// キャッシュになければXMLHttpRequestを生成
		// @ref https://qiita.com/cortyuming/items/b6e3784d08d7a90b3614
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open("GET", url, true);
			xhr.responseType = "arraybuffer";
			xhr.onload = () => {
				if (xhr.readyState === 4 && xhr.status === 200) {
					this.audioCtx.decodeAudioData(xhr.response, function (decodedBuffer) {
						resolve(decodedBuffer);
					});
				} else {
					reject(new Error(xhr.statusText));
				}
			};
			xhr.onerror = () => {
				reject(new Error(xhr.statusText));
			};
			xhr.send(null);
		});
	};
	
	return this;
}


//# getWindowWidth()
function getWindowWidth() {
	var w1 = window ? window.innerWidth : 0;
	var w2 = document.documentElement ? document.documentElement.clientWidth : 0;
	var w3 = document.body ? document.body.clientWidth : 0;
	return w1 || w2 || w3;
}

//# getWindowHeight()
function getWindowHeight() {
	var h1 = window ? window.innerHeight : 0;
	var h2 = document.documentElement ? document.documentElement.clientHeight : 0;
	var h3 = document.body ? document.body.clientHeight : 0;
	return h1 || h2 || h3;
		
}

//# fitWindow()
function fitWindow() {
	var GAME_WIDTH = 640;
	var GAME_HEIGHT = 800;
	var GAME_ASPECT = GAME_WIDTH / GAME_HEIGHT;
	var gameScale = 1;
	var gameOffsetLeft = 0;
	var gameOffsetTop = 0;
	
	// ウィンドウの横幅と高さを取得して縦横比を計算
	var windowWidth = getWindowWidth();
	var windowHeight = getWindowHeight();
	var windowAspect = windowWidth / windowHeight;
	
	/*
	var bg = document.getElementById("bg");
	var bgHeight = windowHeight;
	var bgWidth = Math.floor(windowHeight * 409 / 230);
	if (bgWidth < windowWidth) {
		bgWidth = windowWidth;
		bgHeight = Math.floor(windowWidth * 230 / 409);
	}
	bg.style.backgroundSize = bgWidth + "px " + bgHeight + "px";
	*/
	
	// wapperDivのスタイルにtransformを設定
	// scaleでウィンドウにぴったりさせる translateX, Yでウィンドウ中央に置く
	// ゲーム画面よりもブラウザウィンドウのほうがワイドであるならば
	if (windowAspect > GAME_ASPECT) {
		// 高さをぴっちりさせる
		gameScale = windowHeight / GAME_HEIGHT;
		// 幅が余っているので横に余白が生じる
		var margin = (windowWidth - GAME_WIDTH * gameScale) / 2;
		gameOffsetLeft =  Math.floor(margin);
		gameOffsetTop = 0;
	}
	// ゲーム画面よりもブラウザウィンドウのほうが縦長であるならば
	else {
		// 幅をぴっちりさせる
		gameScale = windowWidth /  GAME_WIDTH;
		// 高さが余っているので縦に余白が生じる
		margin = (windowHeight - GAME_HEIGHT * gameScale) / 2;
		gameOffsetLeft = 0;
		gameOffsetTop = Math.floor(margin);
	}
	setTransform(document.getElementById("main"), gameOffsetLeft, gameOffsetTop, gameScale);
	function setTransform (elm, x, y, scale) {
		scale = "scale(" + scale + ")";
		x = "translateX(" + x + "px)";
		y = "translateY(" + y + "px)";
		var css = [x, y, scale].join(" ");
		elm.style.transform = css;
		elm.style.transformOrigin = "left top";
	}
};

//# getUrlQueries ()
function getUrlQueries() {
	var queryStr = window.location.search.slice(1);
			queries = {};
	if (!queryStr) {
		return queries;
	}
	queryStr.split('&').forEach(function(queryStr) {
		var queryArr = queryStr.split('=');
		if (queryArr[1]) {
			queries[queryArr[0]] = queryArr[1];
		}
		else {
			queries[queryArr[0]] = '';
		}
	});
	return queries;
}