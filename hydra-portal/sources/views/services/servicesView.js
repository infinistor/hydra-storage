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
import {JetView} from "webix-jet";
import ServicesTab from "./servicesTab";

export default class ServicesView extends JetView {
	config(){
		// this.minItemWidth = 243;
		// const initCount = Math.floor(document.documentElement.clientWidth / this.minItemWidth);
		return {
			gravity:4,
			css: "allowOverflow",
			id: "servicesView",
			rows:[
				{
					// borderless: true,
					type:"header", template:"Services", borderless: true,
				},
				{
					height: 15
				},
				ServicesTab
			],
		};
	}
	init() {
		this.resizeElement()
	}
	ready(){
		var resize = this.resizeElement
		webix.event(window, "resize", function() {
			resize()
		})
	}
	resizeElement() {
		const servicesView = $$("servicesView")

		if(servicesView) {
			const topBar = 48
			var notificationWindowDatatable = 0
			var notificationBar = 0
			var html = document.documentElement;
	
			var height = html.offsetHeight
		
			if($$("notificationWindow").config) {
				if(height - $$("notificationWindow").config.top > 45) {
					notificationWindowDatatable = 282
					notificationBar = 34
				}
			}
			servicesView.config.height = height - (topBar + notificationWindowDatatable + notificationBar)
			servicesView.resize()
		}
	}
}
