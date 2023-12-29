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

export default class EmailNotificationsAccordion extends JetView {
	config() {
		const labelWidth = 300

		return {
			borderless: true,
			disabled: true,
			rows: [
				{
					view: "form",
					elements: [
						{
							cols: [
								{
									width: 600,
									rows: [
										{
											view: "label", label: "Sender"
										},
										{
											view: "form",
											margin: 0,
											height: 320,
											paddingY: 0,
											borderless: true,
											elements: [
												{
													rows: [
														{
															view: "text", label: "SMTP Server", labelWidth: labelWidth - 17,
														},
														{
															view: "text", label: "SMTP Port", labelWidth: labelWidth - 17, value: 25
														},
														{
															view: "text", label: "Sender name", labelWidth: labelWidth - 17,
														},
														{
															view: "text", label: "Sender email", labelWidth: labelWidth - 17,
														},
														{
															view: "switch", label: "Authentication required", value: 0, labelWidth: labelWidth - 17, on: {
																onChange: function (newv, oldv) {
																	if (newv) {
																		$$("usernameText").enable();
																		$$("passwordText").enable();
																	} else {
																		$$("usernameText").disable();
																		$$("passwordText").disable();
																	}
																}
															}
														},
														{
															view: "form",
															borderless: true,
															paddingX: 0,
															paddingY: 0,
															height: 80,
															elements: [
																{
																	padding: {
																		left: 17, right: 0, top: 0, bottom: 0
																	},
																	rows: [
																		{
																			view: "text", id: "usernameText", label: "Username", labelWidth: labelWidth - 17 * 2, inputWidth: 600 - 17 * 2 - 17, disabled: true
																		},
																		{
																			view: "text", id: "passwordText", label: "Password", labelWidth: labelWidth - 17 * 2, inputWidth: 600 - 17 * 2 - 17, disabled: true
																		}
																	]
																}
															]
														},
														{
															view: "switch", label: "Secure connection (SSL/TLS) required", value: 0, labelWidth: labelWidth - 17,
														},
													]
												}
											]
										},
										{
											view: "label", label: "Recipient for system notification"
										},
										{
											view: "form",
											borderless: true,
											paddingY: 0,
											autoheight: true,
											elements: [
												{
													rows: [
														{
															rows: [
																{
																	view: "multitext", label: "Recipient's email", labelWidth: labelWidth - 17,
																}
															]
														},
														{
															view: "text", label: "Subject prefix", labelWidth: labelWidth - 17, value: "[Hydra System]"
														},
													]
												}
											]
										},
										{
											height: 10
										},
										{
											view: "button", value: "Apply", css: "new_style_primary", width: 70
										},
									]
								},
								{}
							]
						},
					]
				}
			]
		}
	}
}