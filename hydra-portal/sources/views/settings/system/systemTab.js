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
import ServerNameAccordion from "./accordions/serverNameAccordion";
import ManagementNetworkInterfaceAccordion from "./accordions/managementNetworkInterfaceAccordion";
import TimeDateAccordion from "./accordions/timeDateAccordion";
import EmailNotificationsAccordion from "./accordions/emailNotificationsAccordion";
import WebUIAccessAccordion from "./accordions/webUIAccessAccordion";
// import RestAPIAccordion from "./accordions/restAPIAccordion";
import LogLevelAccordion from "./accordions/logLevelAccordion";

export default class SystemTab extends JetView {
	config() {
		return {
			id: "systemTab",
			borderless: true,
			rows: [
				{ height: 15 },
				{
					type: "line", padding: { left: 15, right: 30, top: 0, bottom: 0 },
					rows: [
						{ header: "Server Name", borderless: true, collapsed: false, body: ServerNameAccordion },
						{ height: 15 },
					]
				},
				{
					type: "line", padding: { left: 15, right: 30, top: 0, bottom: 0 },
					rows: [
						{ header: "Management Network Interface", borderless: true, collapsed: false, body: ManagementNetworkInterfaceAccordion },
						{ height: 15 },
					]
				},
				{
					type: "line", padding: { left: 15, right: 30, top: 0, bottom: 0 },
					rows: [
						{ header: "Time / Date", borderless: true, collapsed: false, body: TimeDateAccordion },
						{ height: 15 },
					]
				},
				{
					type: "line", padding: { left: 15, right: 30, top: 0, bottom: 0 },
					rows: [
						{ header: "Log Level", borderless: true, collapsed: false, body: LogLevelAccordion },
						{ height: 15 },
					]
				},
				{
					type: "line", padding: { left: 15, right: 30, top: 0, bottom: 0 },
					rows: [
						{ header: "Email Notifications - In Progress", borderless: true, collapsed: false, body: EmailNotificationsAccordion },
						{ height: 15 },
					]
				},
				{
					type: "line", padding: { left: 15, right: 30, top: 0, bottom: 0 },
					rows: [
						{ header: "WEB UI Access", borderless: true, collapsed: false, body: WebUIAccessAccordion },
						{ height: 15 },
					]
				},
				// {
				//     type:"line", padding: { left: 15, right: 30, top: 0, bottom: 0 },
				//     rows:[
				//         { header:"REST API Access", borderless:true, collapsed:false, body:RestAPIAccordion },
				//         { height: 15 },
				//     ]
				// },
			]
		}
	}
}
