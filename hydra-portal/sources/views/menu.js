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
import { JetView, plugins } from "webix-jet";
import NotificationWindow from "./popups/notificationWindow"

var notificationWindow
export default class MenuView extends JetView {
	config() {
		const theme = this.app.config.theme;
		return {
			rows: [
				{
					width: 200,
					localId: "side:menu",
					view: "sidebar",
					css: theme,
					collapsed: true,
					borderless: true,
					data: [
						{
							value: "Dashboard", icon: "mdi mdi-gauge", id: "dashboard"
							// data: [
							// 	{ id: "dashboard-temp", value: "Dashboard 1" },
							// 	{ id: "dashboard", value: "Dashboard 2" },
							// ] 
						},
						{
							id: "storage", value: "Storage", icon: "mdi mdi-database", data: [
								{ id: "pool", value: "Storage Management" },
								{ id: "snapshot", value: "Snapshot Management" },
								{ id: "scrub", value: "Scrub" },
							]
						},
						{
							id: "services", value: "Services", icon: "mdi mdi-package", data: [
								{ id: "smb", value: "hydraSMB" },
								{ id: "nfs", value: "hydraNFS" },
								{ id: "s3", value: "hydraS3" },
								{ id: "ksan", value: "hydraKSAN" },
							]
						},
						{
							id: "users", value: "Users / Groups", icon: "mdi mdi-account", data: [
								{ id: "user", value: "User Management" },
								{ id: "group", value: "Group Management" },
								{ id: "chap", value: "CHAP Authentication" }]
						},
						{
							id: "settings", value: "System Settings", icon: "mdi mdi-cog", data: [
								{ id: "system", value: "System" },
								{ id: "network", value: "Network" },
							]
						},
						{
							id: "logs", value: "Logs", icon: "mdi mdi-text-box-multiple", data: [
								{ id: "hydra_log", value: "Hydra Logs" },
								{ id: "syslog", value: "Server Syslogs" },
							]
						},
					]
				},
				{

					borderless: true,
					id: "menuSpacer"
				},
				{
					view: "button", id: "menuNotificationButton", type: "icon", icon: "mdi mdi-bullhorn", label: "<span class='button_label'>Notifications</span>", height: 36, css: "webix_transparent menuNotificationButton", align: "left", click: () => {
						notificationWindow.resizeWindow()
					},
				},
			]
		};
	}
	init(sidebar) {
		this.use(plugins.Menu, this.$$("side:menu"));
		this.on(this.app, "menu:toggle", () => this.$$("side:menu").toggle());
		// sidebar.getPopup().attachEvent("onBeforeShow",() => false);

		notificationWindow = this.ui(NotificationWindow)
		notificationWindow.showWindow()
	}
}
