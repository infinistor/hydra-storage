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

export default class BucketLifecycleRuleWindow extends JetView {
	config() {
		var lifecycleRuleId
		var selectedRule
		return {
			view: "window",
			id: "lifecycle_rule_window",
			position: "center",
			width: 500,
			move: true,
			head: {
				view: "toolbar",
				cols: [
					{ width: 4 },
					{ view: "label", label: "Lifecycle Rules", css: "header_label" },
					{
						view: "icon", icon: "wxi-close",
						click: function () {
							$$("lifecycle_rule_window").hide()
						}
					}
				]
			},
			body: {
				view: "form",
				width: 500,
				id: "lifecycle_rule_form",
				elements: [
					{ view: "text", label: "Prefix", name: "prefix", id: "prefix_field" },
					{
						cols: [
							// {
							//     view: "label", label: 'Permanently delete files after number of days', labelWidth: 300
							// },
							{
								view: "checkbox", label: "Permanently delete files after number of days", labelWidth: 282, id: "expiration_checkbox", value: 0, css: {
									"margin-top": "-2px !important"
								}, on: {
									onChange: function (data) {
										if (data === 1) {
											$$("expiration_field").show()
										} else {
											$$("expiration_field").hide()
										}
									},
									onBeforeRender: function (data) {
										if (selectedRule) {
											if (selectedRule.Expiration > -1) {
												$$("expiration_checkbox").setValue(1)
											}
										}
									}
								}
							}
						]
					},
					{ view: "counter", name: "expiration", value: 0, align: "center", id: "expiration_field", hidden: true },
					{
						cols: [
							// {
							//     view: "label", label: 'Abort unsuccessfully completed uploads after number of days', labelWidth: 300
							// },
							{
								view: "checkbox", label: "Abort unsuccessfully completed uploads after number of days", labelWidth: 385, id: "abort_checkbox", value: 0, css: {
									"margin-top": "-2px !important"
								}, on: {
									onChange: function (data) {
										if (data === 1) {
											$$("abort_field").show()
										} else {
											$$("abort_field").hide()
										}
									},
									onBeforeRender: function (data) {
										if (selectedRule) {
											if (selectedRule.AbortIncompleteMultipartUpload > -1) {
												$$("abort_checkbox").setValue(1)
											}
										}
									}
								}
							}
						]
					},
					{ view: "counter", name: "abort_multipart", value: 0, align: "center", id: "abort_field", hidden: true },
					{
						cols: [
							{
								view: "label", label: "Transitions"
							},
							{},
							{
								view: "button", width: 30, css: "button-font-size-change", value: "+", type: "form", click: function () {
									$$("transitions").add({ storageClass: "", days: "" })
									$$("transitions").refresh()
								}
							},
							{
								view: "button", width: 30, value: "—", type: "form", click: function () {
									if ($$("transitions").count()) {
										$$("transitions").remove($$("transitions").getLastId())
										$$("transitions").refresh()
									}
								}
							}
						]
					},
					{
						view: "datatable",
						editable: true,
						id: "transitions",
						scroll: "auto",
						autoheight: true,
						autoConfig: true,
						columns: [
							{
								id: "storageClass", header: { text: "Storage Class", css: { "text-align": "center" } }, fillspace: 1, editor: "combo", options: [
									"STANDARD_IA", "ONEZONE_IA", "GLACIER", "GLACIER_IR", "DEEP_ARCHIVE", "INTELLIGENT_TIERING"
								]
							},
							{ id: "days", header: { text: "Days", css: { "text-align": "center" } }, fillspace: 1, editor: "text" },
						],
						data: [],
					},
					{
						margin: 5, cols: [
							{
								view: "button", autowidth: true, value: "Save", css: "webix_primary", type: "form", click: function () {
									if (selectedRule) {
										$$("transitions").editStop()

										if ($$("abort_checkbox").getValue() === 1) {
											selectedRule.AbortIncompleteMultipartUpload = $$("abort_field").getValue()
										} else {
											selectedRule.AbortIncompleteMultipartUpload = -1
										}

										if ($$("expiration_checkbox").getValue() === 1) {
											selectedRule.Expiration = $$("expiration_field").getValue()
										} else {
											selectedRule.Expiration = -1
										}

										selectedRule.Prefix = $$("prefix_field").getValue()
										selectedRule.Transitions = []
										var transitions = $$("transitions").serialize()
										for (var i = 0; i < transitions.length; i++) {
											var transition = {
												StorageClass: transitions[i].storageClass,
												Days: parseInt(transitions[i].days)
											}
											selectedRule.Transitions.push(transition)
										}
										$$("lifecycle_rules").refresh()
										$$("lifecycle_rule_window").hide()
									} else {
										$$("transitions").editStop()
										var expiration = -1
										var abortUploads = -1
										if ($$("expiration_checkbox").getValue() === 1) {
											expiration = $$("expiration_field").getValue()
										}
										if ($$("abort_checkbox").getValue === 1) {
											abortUploads = $$("abort_field").getValue()
										}
										var ruleEntry = {
											Status: 1,
											Prefix: $$("prefix_field").getValue(),
											Expiration: expiration,
											Transitions: [],
											AbortIncompleteMultipartUpload: abortUploads
										}
										var transitions = $$("transitions").serialize()
										for (var i = 0; i < transitions.length; i++) {
											if (transitions[i].storageClass === "" || transitions[i].days === "") continue
											var transition = {
												StorageClass: transitions[i].storageClass,
												Days: parseInt(transitions[i].days)
											}
											ruleEntry.Transitions.push(transition)
										}
										if (ruleEntry.AbortIncompleteMultipartUpload !== -1 ||
											ruleEntry.Expiration !== -1 ||
											ruleEntry.Transitions.length > 0) {
											$$("lifecycle_rules").add(ruleEntry)
										}

										$$("lifecycle_rule_window").hide()
									}
								}
							},
							{}
						]
					}
				]
			},
			on: {
				onBeforeShow: () => {
					lifecycleRuleId = this.getParam("lifecycleRuleId", true)

					$$("transitions").clearAll()

					$$("expiration_checkbox").setValue(0)
					$$("expiration_field").setValue(0)

					$$("abort_checkbox").setValue(0)
					$$("abort_field").setValue(0)

					$$("prefix_field").setValue("")

					selectedRule = $$("lifecycle_rules").getItem(lifecycleRuleId)

					if (selectedRule) {
						for (var i = 0; i < selectedRule.Transitions.length; i++) {
							$$("transitions").add({
								storageClass: selectedRule.Transitions[i].StorageClass,
								days: selectedRule.Transitions[i].Days
							})
						}
						$$("transitions").refresh()

						$$("prefix_field").setValue(selectedRule.Prefix)

						if (selectedRule.Expiration > -1) {
							$$("expiration_checkbox").setValue(1)
							$$("expiration_field").setValue(selectedRule.Expiration)
						}

						if (selectedRule.AbortIncompleteMultipartUpload > -1) {
							$$("abort_checkbox").setValue(1)
							$$("abort_field").setValue(selectedRule.AbortIncompleteMultipartUpload)
						}
					}
				}
			}
		}
	}
	showWindow() {
		$$("lifecycle_rule_window").show()
	}
	hideWindow() {
		$$("lifecycle_rule_window").hide()
	}
}