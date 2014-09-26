define(["browser/avalon.browser", "text!./avalon.uploader.html", "uploader/mmRequest", "./swfobject/swfobject", "css!./avalon.uploader.css"], function(avalon, sourceHTML){

	var widget = avalon.ui.uploader = function(element, data, vmodels){

		var fileList = [],		// 存放file对象
			browseButton,		// 按钮
			browseButtonClick,	// browseButton 绑定的 click 事件
			ie_version = avalon.browser.ie,
			swf,				// {dom} <object>
			hasLoadFlash = false;

		var vmodel = avalon.define(data.uploaderId, function(vm){

			vm.files = [];

			avalon.mix(vm, data.uploaderOptions);

			browseButton = document.getElementById(vm.browseButton);

			vm.removeFile = function(index){
				// fileList.splice(index, 1);
				avalon.post(vmodel.action, {
					id: vmodel.files[index].id
				}, function(data){
					
					if(data.errcode == 0){
						// 成功
						vmodel.files.removeAt(index);
						swf.setUploadSuccessNum(vmodel.files.length);
					}

				}, 'json');
			};
			

			vm.$init = function(){

				loadFlash();
				// loadInput();
				
				avalon.scan(element, [vmodel].concat(vmodels));
			};

			vm.$remove = function(){
				
			};
			
		});

		vmodel.files.$watch('length', function(val){
			if(val == vmodel.max){
				vmodel.$init();
			}
		});
		
		avalon.jsHandler = function(obj){
			// console.log(obj);

			switch(obj.type){
				case 'uploading':
					// 上传时触发
				break;
				case 'singleSuccess':
					// 单个文件成功时触发
					/*var file = obj.data;

					vmodel.files.push({
						name: file.name,
						src: file.source.data.images[0].url,
						id: file.source.data.images[0].id
					});*/
				break;
				case 'uploaded':
					var _imgs = obj.data.sucAry;
					for (var i = 0, len = _imgs.length; i < len; i++) {
						vmodel.files.push({
							name: _imgs[i].name,
							src: _imgs[i].source.data.images[0].url,
							id: _imgs[i].source.data.images[0].id
						});
					};
				break;
				case 'flashInit':
					// 初始化，取到 swf
					swf = document.getElementById('ExifUpload');
					// 防止用户隐藏起 flash 导致原先配置丢失，这里重新配置 flash
					swf.setMaxFileNum(vmodel.max);
					swf.setUploadSuccessNum(vmodel.files.length);
				break;
				case 'fileSizeErr':
					vmodel.fileSizeErr(obj.data);
				break;
				case 'fileNumErr':
					vmodel.fileNumErr(vmodel.max - vmodel.files.length, obj.data);
				break;
			}
		};

		return vmodel;


		function loadInput(){
			// 创建 input 元素
			var input = avalon.parseHTML(sourceHTML.split("MS_OPTION_COM")[0]).firstChild;
			// 绑定事件
			input.onchange = function(e){

				var files = this.files;
				
				if(files){	// chrome, ff, ie10+
					for(var i = 0, len = files.length; i < len; i++){
						preViewImg(files[i]);
					}
				}else{		// ie9-
					/*
					 * 出于安全考虑浏览器一般会使用 fakepath 隐藏真实路径，
					 * 所以下面这行代码无效：
					 * vmodel.files.push(this.value.replace(/\\/g, '/'));
					 *
					 * 参考：http://www.iefans.net/ie-shangchuan-bendi-lujing-fakepath/
					 * 以下代码有效：
					 * 但是，如果该 change 事件是由其他事情异步触发的，则无效。
					 */
					this.select();
					this.blur();
					vmodel.files.push({
						src: document.selection.createRange().text
					});
				}

				// 清空input，保证下次change事件的触发
				this.value = '';
				// ie10-下无法清空，借用form的reset方法
				if(this.value){
					var _tempForm = document.createElement('form'),
						_nextElement = this.nextSibling,
						_parentElement = this.parentNode;

					// 取出并清空该input
					_tempForm.appendChild(this);
					_tempForm.reset();

					// 放回该input
					if(_nextElement){
						_nextElement.parentNode.insertBefore(this, _nextElement);
					}else{
						// 如果不存在后节点，通过父节点放回
						_parentElement.appendChild(this);
					}
				}

			};

			// 绑定 input click 事件
			browseButtonClick = avalon.bind(browseButton, "click", function(){
				input.click();
			});


			// 插入 input 元素
			if(ie_version > 0 && ie_version < 10){
				// ie9- 用其他异步事件来触发 input.click 无法取得文件本地路径
				// 必须还是要点到 input 上，所以插到按钮内部
				browseButton.appendChild(input);
			}else{
				// 其他浏览器随便插入，隐藏就行
				input.style.display = 'none';
				element.appendChild(input);
			}
		}

		function loadFlash(){
			
			var flash = avalon.parseHTML(sourceHTML.split("MS_OPTION_COM")[1]).firstChild;

			if(hasLoadFlash){
				browseButton.removeChild(browseButton.lastChild);
			}

			browseButton.appendChild(flash);

			var flashvars = {
				js_handler:"avalon.jsHandler",
				uploadAPI: vmodel.action,
				swfID:"swf13889",
				maxFileSize: vmodel.fileMaxSize,
				maxFileNum: vmodel.max
			};
			var params = {
				menu: "false",
				scale: "noScale",
				allowFullscreen: "true",
				allowScriptAccess: "always",
				bgcolor: "",
				wmode: "transparent" // 透明
			};
			var attributes = {
				id:"ExifUpload"
			};
			avalon.swfobject.embedSWF(
				"swfobject/multiPicUpload.swf", 
				"altContent", "100%", "100%", "10.0.0", 
				"expressInstall.swf", 
				flashvars, params, attributes
			);

			hasLoadFlash = true;
		}

		function preViewImg(file){
					
			if(/image/.test(file.type)){
				
				var reader = new FileReader();
				reader.readAsDataURL(file);
				
				reader.onprogress = function(e){
					/* if(e.lengthComputable){
						console.log('ok: ' + e.loaded + '/' + e.total);
					}else{
						console.log('no ok.');
					}*/
				};
				reader.onload = function(){
					if(vmodel.files.length < vmodel.max){
						vmodel.files.push({
							src: reader.result,
							name: file.name,
							size: file.size
						});
						fileList.push(file);
					}
				};
			}
		}
	};

	widget.version = 1.0;
	widget.defaults = {
		fileMaxSize: 1024,
		fileSizeErr: function(filename){
			alert(filename + '太大了');
		},
		fileNumErr: function(availableNum, selectNum){
			alert('还可选择' + availableNum + '个，你选择了' + selectNum + '个，超出了');
		}
	};

	return avalon;
});