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

export default class AdvancedSettingsAccordion extends JetView {
	config() {
		const labelWidth = 210
		return {
			view: "form",
			padding: 0,
			elements: [
				{
					padding: {
						top: 10, left: 30, right: 10, bottom: 0
					},
					rows: [
						{
							view: "switch", id: "smbSupportForMacOSSwitch", label: "Support for macOS", labelWidth: labelWidth
						},
						{
							view: "switch", id: "smbOplockSwitch", label: "Oplocks", labelWidth: labelWidth, value: 1
						},
						{
							view: "switch", id: "smbLevel2Oplocks", label: "Level2 Oplocks", labelWidth: labelWidth, value: 1
						},
						{
							view: "switch", id: "smbKernelShareModels", label: "Kernel Share Models", labelWidth: labelWidth, value: 0, hidden: true
						},
						{
							view: "switch", id: "smbPosixLocking", label: "Posix Locking", labelWidth: labelWidth, value: 1
						},
						{
							view: "switch", id: "smbInheritOwner", label: "Inherit Owner", labelWidth: labelWidth, value: 0, hidden: true,
						},
						{
							view: "switch", id: "smbInheritPermissions", label: "Inherit Permissions", labelWidth: labelWidth, value: 1
						},
						{
							view: "switch", id: "smbDeleteVetoFiles", label: "Delete Veto Files", labelWidth: labelWidth, value: 1,
						},
						{
							padding: {
								top: 0, left: labelWidth, right: 0, bottom: 0
							},
							autoheight: true,
							rows: [
								{
									view: "button", id: "smbVetoFiles", value: "Veto Files", width: 100, click: function () {
										if (!$$("smbVetoFilesText").isVisible()) {
											$$("smbVetoFilesText").show()
										}
									}
								},
								{
									view: "textarea", id: "smbVetoFilesText", width: 200, hidden: true
								}
							],
						},
						{
							view: "switch", id: "smbFullAudit", label: "Full Audit", labelWidth: labelWidth, value: 0, hidden: true
						}
					]
				},
				{}
			]
		}
	}
}