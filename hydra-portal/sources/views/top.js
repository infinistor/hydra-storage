/*
* Copyright (c) 2021 PSPACE, inc. KSAN Development Team ksan@pspace.co.kr
* KSAN is a suite of free software: you can redistribute it and/or modify it under the terms of
* the GNU General Public License as published by the Free Software Foundation, either version
* 3 of the License.  See LICENSE for details
*
* 본 프로그램 및 관련 소스코드, 문서 등 모든 자료는 있는 그대로 제공이 됩니다.
* KSAN 프로젝트의 개발자 및 개발사는 이 프로그램을 사용한 결과에 따른 어떠한 책임도 지지 않습니다.
* KSAN 개발팀은 사전 공지, 허락, 동의 없이 KSAN 개발에 관련된 모든 결과물에 대한 LICENSE 방식을 변경 할 권리가 있습니다.
 */
import { JetView } from "webix-jet";
import MenuView from "./menu";

export default class TopView extends JetView {
	config() {
		const theme = this.app.config.theme;
		return {
			rows: [
				{
					view: "toolbar",
					// css:theme,
					css: "webix_dark",
					elements: [
						{
							paddingY: 7,
							rows: [
								{
									cols: [
										{
											view: "icon",
											icon: "mdi mdi-menu",
											width: 42,
											click: () => this.app.callEvent("menu:toggle")
										},
										{
											view: "label", label: "Infinistor Hydra", css: "header_label"
										},
										{},
										// {
										// 	view: "richselect",
										// 	id: "skinSelector",
										// 	value: "mini",
										// 	options: [ "compact", "contrast", "dark", "flat", "material", "mini", "willow" ],
										// 	width: 110,
										// 	on: {
										// 		onChange: (newValue, oldValue) => {
										// 			var links = document.getElementsByTagName("link");
										// 			for(var i=0; i<links.length; i++){
										// 				var link = links[i];
										// 				if((link.href).includes(oldValue + ".css")){
										// 					link.href = link.href.replace(oldValue, newValue);
										// 					webix.skin.set(newValue);
										// 					break;
										// 				}
										// 			}
										// 		}
										// 	}
										// }

										// logout button
										{
											view: "icon", icon: "mdi mdi-logout-variant", width: 42, tooltip: "Logout", click: () => {
												// remove cookies
												webix.storage.cookie.clear()

												// redirect to login page
												this.show("/login")
											}
										}
									]
								}
							]
						},
					]
				},
				{
					cols: [
						MenuView,
						{ $subview: true },
					]
				}
			]
		};
	}
	init() {
		// check if user is logged in
		if (!webix.storage.cookie.getRaw('access_token')) {
			webix.delay(() => this.show("/login"));
		}
	}
}
