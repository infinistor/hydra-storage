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
import { ajaxFail } from "../../../../functions/ajaxFail";

const windowWidth = 500;
export default class ModifyPoolWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		var poolRefId
		var poolName

		return {
			view: "window",
			id: "modify_pool_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Modify Pool", css: "header_label" }
				],
			},
			body: {
				view: "form",
				css: "allowOverflow",
				id: "modify_pool_form",
				elements: [
					{
						cols: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "text", label: "Pool Name", labelWidth: labelWidth, name: "pool_name", id: "modifyPool_poolName", readonly: true
									},
									{
										view: "switch", id: "modifyPool_compress", label: "Compression", labelWidth: labelWidth, value: 0, on: {
											onChange: function (newVal, oldVal) {
												if (newVal == 1) {
													$$("modifyPool_compressAlgorithm").show()
												} else {
													$$("modifyPool_compressAlgorithm").hide()
												}
											}
										}
									},
									{
										view: "richselect", id: "modifyPool_compressAlgorithm", label: "Compression Algorithm", labelWidth: labelWidth, options: [
											{ id: "lz4", value: "LZ4" },
											{ id: "gzip", value: "GZIP" },
											{ id: "zle", value: "ZLE" },
											{ id: "lzjb", value: "LZJB" },
											{ id: "zstd", value: "ZSTD" },
										], value: "lz4", hidden: true,

									},
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													// if all fields are valid, then add the VLAN
													if ($$("modify_pool_form").validate({ hidden: true })) {
														$$("modify_pool_window").disable()
														$$("modify_pool_window").showProgress({
															type: "icon",
															hide: false,
														})

														var json = {
															"compression": $$("modifyPool_compress").getValue() == 1 ? $$("modifyPool_compressAlgorithm").getValue() : "off",
														}

														webix.ajax().put("/api/storage/pools/" + poolRefId, JSON.stringify(json)).then((response) => {
															webix.message({ type: "success", text: "Pool modified successfully", expire: 10000 })
														}).fail((xhr) => {
															ajaxFail(xhr)
														})

														$$("modify_pool_window").enable()
														$$("modify_pool_window").hideProgress()
														this.hideWindow()
													}
												}
											},
											{
												view: "button", value: "Cancel", css: "new_style_button", width: 70, click: () => {
													this.hideWindow()
												}
											},
										]
									},
								]
							},
							{}
						]
					},
				],
				rules: {
					"pool_name": webix.rules.isNotEmpty,
				}
			},
			on: {
				onShow: () => {
					poolRefId = this.getParam("pool_id", true)

					webix.ajax().get("/api/storage/pools/" + poolRefId).then((response) => {
						var pool = response.json()
						poolName = pool.name

						$$("modifyPool_poolName").setValue(poolName)

						$$("modifyPool_compress").setValue(pool.compression == "off" ? 0 : 1)
					})
				},
				onHide: () => {
					$$("modifyPool_compress").setValue(0)

					$$("modify_pool_form").clear()
					$$("modify_pool_form").clearValidation()
				}
			},
			position: function (state) {
				state.top = topBar
				state.left = state.maxWidth - windowWidth
				state.height = state.maxHeight - (topBar)
				state.width = windowWidth
			}
		}
	}
	init() {
		webix.extend($$("modify_pool_window"), webix.ProgressBar)
	}
	ready() {
		var networkModifyPoolWindow = $$("modify_pool_window")

		webix.UIManager.addHotKey("esc", function () {
			if (networkModifyPoolWindow.isVisible())
				networkModifyPoolWindow.hide()
		})

		var resize = this.resizeElement
		webix.event(window, "resize", function () {
			resize()
		})
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
	resizeElement() {
		const ModifyPoolForm = $$("modify_pool_form")

		if (ModifyPoolForm) {
			const topBar = 48
			const labelToolbar = 35
			var html = document.documentElement;

			var height = html.offsetHeight


			ModifyPoolForm.config.height = height - (topBar + labelToolbar)
			ModifyPoolForm.resize()
		}
	}
}