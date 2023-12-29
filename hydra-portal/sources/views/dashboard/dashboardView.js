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
import SystemStatusPanel from "./panels/systemStatusPanel";
import HydraSMBPanel from "./panels/hydraSMBPanel";
import HydraNFSPanel from "./panels/hydraNFSPanel";
import HydraS3Panel from "./panels/hydraS3Panel";
import PoolStatusPanel from "./panels/poolStatusPanel";

import { getTimeInterval, setTimeInterval } from "../../functions/timeIntervalForDashboard";
import { ajaxFail } from "../../functions/ajaxFail";

// number of rows
var gridSize = 8
export default class DashboardView extends JetView {
	config(){
		return {
			gravity:4,
			css: "allowOverflow",
            id: "dashboardView",
			margin: 0,
			padding: 0,
			rows:[
				{
					view: "toolbar",
					height: 35,
					css: "dashboard-toolbar",
					borderless: true,
					elements: [
						{
							type:"header", borderless: true, template:"<span style='font-weight: 100; margin-right: 5px'>Dashboard</span>",
						},
						{},
						{
							view: "richselect", id: "dashboardTimeInterval", label: "Refresh every", labelWidth: 95, width: 165, options: [
								{ id: 3, value: "3s" },
								{ id: 5, value: "5s" },
								{ id: 10, value: "10s" },
								{ id: 15, value: "15s" },
								{ id: 20, value: "20s" },
							], on: {
								onChange: function(newValue, oldValue) {
									// change src property of iframe
									var iframe_src = $$("dashboardIframe").getIframe().src
									iframe_src = iframe_src.split("&refresh=")[0]
									iframe_src += "&refresh=" + newValue + "s&kiosk"

									$$("dashboardIframe").define("src", iframe_src)

									setTimeInterval(newValue)
								}
							}
						}
					]
				},
				{
					view: "scrollview",
					id: "dashboardScrollview",
					scroll: "y",
					margin: 0,
					padding: 0,
					borderless: true,
					body: {
						borderless: true,
						css: "dashboardGrid",
						margin: 0, padding: 0,
						rows: [
							{
								view:"dashboard", id:"grid1", autoplace: false,
								cellHeight: 142, 
								height: 152,
								paddingX: 16,
								paddingY: 0,
								gridColumns:8, gridRows:1,
								cells: [
									{
										view:"panel", 
										// icon: "mdi mdi-dots-horizontal",
										header: "System Status",
										css: "dashboard-panel-header",
										id: "first", x:0, y:0, dx:1, dy:1,
										resize:true, body:SystemStatusPanel
									},
									{
										view:"panel", 
										css: "dashboard-panel-header",
										// icon: "mdi mdi-dots-horizontal",
										header: "HydraSMB",
										id: "second", x:1, y:0, dx:1, dy:1,
										resize:true, body:HydraSMBPanel
									},
									{
										view:"panel", 
										css: "dashboard-panel-header",
										// icon: "mdi mdi-dots-horizontal",
										header: "HydraNFS",
										id: "third", x:2, y:0, dx:1, dy:1, 
										resize:true, body:HydraNFSPanel
									},
									{
										view:"panel", 
										css: "dashboard-panel-header",
										// icon: "mdi mdi-dots-horizontal",
										header: "HydraS3",
										id: "fourth", x:3, y:0, dx:1, dy:1,
										resize:true, body:HydraS3Panel
									},
								],
								on: {
									onChange: function() {
										var state = this.serialize()
										webix.storage.local.put("grid1-dashboard-state", state)
									},
								}
							},
							{
								view: "carousel",
								id: "dashboardCarousel",
								css: "webix_dark",
								borderless: true,
								navigation: {
									type: "side",
									items: false,
									// buttons: false,
								},
								cols: [],
								hidden: true,
							},
							{
								height: 10
							},
							{
								view: "iframe",
								id: "dashboardIframe",
								borderless: true,
								hidden: true,
							},
							{
								id: "dashboardBottomSpacer",
								rows: [
									{}
								]
							}
						]
					},
				},
			],
		};
	}
	init() {
		this.resizeElement()

		const currentTimeInterval = getTimeInterval() / 1000

		// set time interval for updating the dashboard
		$$("dashboardTimeInterval").setValue(currentTimeInterval)

		webix.ajax().get("/api/system/grafana-ip").then((data) => {
			var response = data.json()

			if (!response) {
				$$("dashboardIframe").hide()
				if(!$$("dashboardCarousel").isVisible()) $$("dashboardBottomSpacer").show()
				else $$("dashboardBottomSpacer").hide()
				return
			}

			var iframe_src = response + "&refresh=" + currentTimeInterval + "s&kiosk"
			$$("dashboardIframe").define("src", iframe_src)
			$$("dashboardIframe").show()
			$$("dashboardBottomSpacer").hide()
		}).fail(() => {
			$$("dashboardIframe").hide()
			if(!$$("dashboardCarousel").isVisible()) $$("dashboardBottomSpacer").show()
			else $$("dashboardBottomSpacer").hide()
		})


		var state1 = webix.storage.local.get("grid1-dashboard-state");
		if(state1) {
			$$("grid1").restore(state1);
		}

		$$("grid1").attachEvent("onBeforeDrop", function(context, ev) {
			var x = context.dashboard.x
			var y = context.dashboard.y
			
			var target = this.queryView({x,y});
			// swap positions of the two panels:
			// if the panel is dropped on an empty cell, then put it there
			// else exchange positions of the two panels
			if(target) this.moveView(target.config.id, { x:context.source.config.x, y:context.source.config.y, dx:1, dy:1 });
			this.moveView(context.source.config.id, { x:x, y:y, dx:1, dy:1 });
			
			return false;
		})

		// allow drag only if source is a header
		$$("grid1").attachEvent("onBeforeDrag", function(context, ev) {
			// if source is a header (class contains "webix_template"), allow drag
			// else don't allow drag
			if(ev.srcElement.outerHTML.includes('class=" webix_template"')) return true
			else return false
		})

		// var menu = webix.ui({
		// 	view:"contextmenu",
		// 	autowidth: true,
		// 	click:function(id){

		// 	},
		// 	data:[
		// 		{ id: "hide", value: "Hide" },
		// 	]
		// })

		// webix.event(document.body, "click", function(ev){
		// 	var css = ev.target.className;
		// 	if (css && css.toString().indexOf("panel_icon") != -1){
		// 	  menu.setContext(webix.$$(ev.target));
		// 	  menu.show(ev.target);
		// 	}
		// })

		this.adjustGrid()

		// load pool information
		webix.ajax().get("/api/storage/pools").then((data) => {
			var pools = data.json()

			for(let i = 0; i < pools.length; i += 4) {
				var panels = []
				for (var j = 0; j < 4 && i + j < pools.length; j++) {
					panels.push(
						new PoolStatusPanel(this.app, "", pools[i + j])
					)
				}

				if (panels.length == 0) $$("dashboardCarousel").hide()
				else $$("dashboardCarousel").show()

				$$("dashboardCarousel").addView({
					rows: [
						{
							height: 9
						},
						{
							cols: [
								{
									width: 17
								},
								panels.length > 0 ? panels[0] : {},
								{
									width: 9
								},
								panels.length > 1 ? panels[1] : {},
								{
									width: 9
								},
								panels.length > 2 ? panels[2] : {},
								{
									width: 9
								},
								panels.length > 3 ? panels[3] : {},
								{
									width: 17
								},
							]
						},
						{
							height: 1
						}
					]
				}, i)
			}
		}).fail((xhr) => {
			ajaxFail(xhr)
		})
	}
	ready(){ 
		var resize = this.resizeElement
		var adjustGrid = this.adjustGrid
		this.ev = webix.event(window, "resize", function() {
			resize()
			adjustGrid()
		})
	}
	urlChange() {
		gridSize = 8
	}
	resizeElement() {
		const dashboardView = $$("dashboardView")
		if(dashboardView) {
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
			dashboardView.config.height = height - (topBar + notificationWindowDatatable + notificationBar)
			dashboardView.resize()
		}
	}
	adjustGrid() {
		// if screen width is less than 812px, use 1 column
		if(window.innerWidth < 812) {
			if(gridSize != 1) {
				gridSize = 1
				// grid1
				const grid1 = $$("grid1")
				var grid1_panels = grid1.serialize()

				// change x and y values
				for(var i = 0; i < grid1_panels.length; i++) {
					if(grid1_panels[i].x > 0) {
						var newX = grid1_panels[i].y
						var newY = grid1_panels[i].x

						grid1_panels[i].x = newX
						grid1_panels[i].y = newY
					}
				}

				grid1.define({
					gridColumns: 1,
					gridRows: 8,
				})

				grid1.resize()
				grid1.restore(grid1_panels)
			}
		} else {
			if(gridSize != 8) {
				gridSize = 8
				// grid1
				const grid1 = $$("grid1")
				var grid1_panels = grid1.serialize()

				// change x and y values
				for(var i = 0; i < grid1_panels.length; i++) {
					if(grid1_panels[i].y > 0) {
						var newX = grid1_panels[i].y
						var newY = grid1_panels[i].x

						grid1_panels[i].x = newX
						grid1_panels[i].y = newY
					}
				}

				grid1.define({
					gridColumns: 8,
					gridRows: 1,
				})

				grid1.resize()
				grid1.restore(grid1_panels)
			}
		}
	}
}