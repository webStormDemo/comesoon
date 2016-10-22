
'use strict';

var MusicPlayer = function(jPlayerSelector, media, options) {
	var	self = this,

		defaults = {
			// solution: "flash, html", // For testing Flash with CSS3
			supplied: "mp3",
			// Android 2.3 corrupts media element if preload:"none" is used.
			// preload: "none", // No point preloading metadata since no times are displayed. It helps keep the buffer state correct too.
			cssSelectorAncestor: ".section-box",
		},
		//dom
		cssSelector = {
			controls: ".container-controls",    //播放控制box
			circleControl: ".circle-control",  //进度条遮罩
			controlsPlay: ".controls-play",    //播放按钮
			controlsPause: ".controls-pause",  //暂停按钮
			controlsNext: ".controls-next",    //下一曲
			vloumeBar: ".vloume-bar",   //音调动画图标
			breathe: ".breathe-radius",  //呼吸圆
			disk: ".controls-normal"    //圆盘
		};

	this.spritePitch = 110;
	this.spriteRatio = 0.24; // Number of steps / 100

	this.player = $(jPlayerSelector);

	this.options = $.extend(true, {}, defaults, options); // Deep copy

	this.audio = {};
	this.dragging = false; // Indicates if the progressbar is being 'dragged'.

	this.eventNamespace = ".CirclePlayer"; // So the events can easily be removed in destroy.

	this.jq = {};
	$.each(cssSelector, function(entity, cssSel) {
		self.jq[entity] = $(self.options.cssSelectorAncestor + " " + cssSel);
	});
	
	//准备进度条容器
	self._musicProcess($('#progress'),'#85e400');
	//self._timeupdate(95);

	//music list
	$.ajax({
		type:"get",
		url:"js/music.json",
		dataType:"json",
		success: function(data){
			var media = data.music
			self._initPlayer(media);
		}
	});	
};

MusicPlayer.prototype = {
	_createHtml: function() {
	},
	_initPlayer: function(media) {
		
		var self = this;
		var tabindex = parseInt(media.length*Math.random());
		var time;
		//var tabindex = 0;
		this.media = media[tabindex];
		this.player.jPlayer(this.options);
		this.player.jPlayer("load");
		this.player.bind($.jPlayer.event.ready + this.eventNamespace, function(event) {
			if(event.jPlayer.html.used && event.jPlayer.html.audio.available) {
				self.audio = $(this).data("jPlayer").htmlElement.audio;
				$(self.audio).attr('autoplay','autoplay');
				//document.addEventListener('touchstart', function () {
				    document.getElementsByTagName('audio')[0].play();
				    //document.getElementsByTagName('audio')[0].pause();
				//});
			}
			self.setMedia(self.media);
		});

		//控制台
		if($.jPlayer.platform.mobile) {
			//mobile
			self.jq.disk.on('click',function(){
				if($('.section-box').hasClass('jp-state-playing')){
					//已在播放
						$(this).addClass('hidden');
						self.jq.controlsPlay.addClass('show');
						self.pause();
				}else{
					//未播放
					self.play();
				}
			});

		}else{
			//pc
			self.jq.controls.hover(function(event){
				if(!self.jq.controlsPlay.hasClass('show')){
					self.jq.disk.addClass('hidden');
					self.jq.controlsPause.addClass('show');
				}
			},function(event){
				if(!self.jq.controlsPlay.hasClass('show')){
					self.jq.disk.removeClass('hidden');	
				}
				self.jq.controlsPause.removeClass('show');												
			});
		}
		//play监测		
		this.player.bind($.jPlayer.event.play + this.eventNamespace, function(event) {
			//alert(1);
			self.jq.breathe.removeClass('show');
			self.jq.vloumeBar.addClass('play');

			if($.jPlayer.platform.mobile) {
				if(self.jq.controlsPause.hasClass('show')){
	 				self.jq.disk.removeClass('hidden');
	 				self.jq.controlsPause.removeClass('show');	
				};
			}
		});

		//play
		this.jq.controlsPlay.on('click',function(){
			
			self.play();
			
			self.jq.controlsPause.addClass('show');
			self.jq.controlsPlay.removeClass('show');
		});

		//pause监测	
		this.jq.controlsPause.on('click',function(){

			self.pause();	

			self.jq.controlsPlay.addClass('show');
			self.jq.controlsPause.removeClass('show');			
		});
		
		//pause
		this.player.bind($.jPlayer.event.pause + this.eventNamespace, function(event) {
			self.jq.breathe.addClass('show');
			self.jq.vloumeBar.removeClass('play');
		});

		//next
		this.jq.controlsNext.on('click',function(e){
			
			tabindex = self.next(media,tabindex);

			self.jq.controlsPlay.removeClass('show');
			self.jq.disk.removeClass('hidden');
		});
		// This event fired as play time increments
		this.player.bind($.jPlayer.event.timeupdate + this.eventNamespace, function(event) {
			if (!self.dragging) {
				self._timeupdate(event.jPlayer.status.currentPercentAbsolute);
			}
		});
		// This event fired as buffered time increments
		this.player.bind($.jPlayer.event.progress + this.eventNamespace, function(event) {
			var percent = 0;
			if((typeof self.audio.buffered === "object") && (self.audio.buffered.length > 0)) {
				if(self.audio.duration > 0) {
					var bufferTime = 0;
					for(var i = 0; i < self.audio.buffered.length; i++) {
						bufferTime += self.audio.buffered.end(i) - self.audio.buffered.start(i);
					}
					percent = 100 * bufferTime / self.audio.duration;
				} // else the Metadata has not been read yet.
			} else { // Fallback if buffered not supported
				// percent = event.jPlayer.status.seekPercent;
				percent = 0; // Cleans up the inital conditions on all browsers, since seekPercent defaults to 100 when object is undefined.
			}
		});
		//ended
		this.player.bind($.jPlayer.event.ended + this.eventNamespace, function(event) {
			tabindex = self.next(media,tabindex);
		});

		return this;
	},
	_resetSolution: function() {
		this._timeupdate(0);
	},
	_timeupdate: function(percent) {

		var sRage = -Math.PI * 0.5;
    	
    	this.ctx.clearRect(0,0,this.width*2,this.width*2);
        this.ctx.beginPath();
        this.ctx.arc(this.width, this.width, this.width-2, sRage, Math.PI*percent/50 + sRage, false);
        this.ctx.stroke();
        this.ctx.closePath();

	},
	//绘制进度条
	_musicProcess: function(el, lineColor){
		var that = this;
    	that.el = el;
        that.lineEl = document.createElement('div');
        that.lineEl.className = 'line';
        that.el.append(that.lineEl);

       	var canvas = document.createElement('canvas');
        that.ctx = canvas.getContext('2d');
        that.width = that.lineEl.clientWidth;
        canvas.setAttribute('width', that.width * 2 + 'px');
        canvas.setAttribute('height', that.width * 2 + 'px');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        that.lineEl.appendChild(canvas);

        that.ctx.moveTo(0, 0);
        that.ctx.lineWidth = 4;
        that.ctx.strokeStyle = lineColor;
	},
	setMedia: function(media) {
		this.player.jPlayer("setMedia", media).jPlayer("play");
	},
	play: function() {
		this.player.jPlayer("play");
	},
	pause: function(time) {
		this.player.jPlayer("pause");
	},
	next: function(media,tabindex){
		
		this._resetSolution();
		tabindex = tabindex+1;
		
		if(tabindex == media.length){
			tabindex = 0; 
		}			
		this.setMedia(media[tabindex]);
		
		return tabindex;
	},
	prev: function(){
		//code
	},
	loop: function(){
		//code
	},
	destroy: function() {
		this.player.unbind(this.eventNamespace);
		this.player.jPlayer("destroy");
	}
};
