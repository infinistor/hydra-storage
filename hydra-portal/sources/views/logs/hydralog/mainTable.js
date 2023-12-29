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

import { levelToIcons, center } from "../../../functions/levelToIconTemplate";

export default class HydraMainTable extends JetView {
    config() {
        var searchResult = ""
        var firstDateFilterSkip = false
        var dateFilterValue

        function searchColumnTemplate(data, type, value) {
            let search = searchResult
            // if(highlight_list.length > 0) {
            //     value = highlightText(value, highlight_list)
            // }
            if(search) {
                value = addTextMark(value, search);
            }
            if(data.$group) {
                return type.treetable(data, type) + "<span style='font-weight:500; font-size: 110%'>" + value + "</span>";
            } else {
                return value
            }
        }

        function addTextMark(value, text) {
            const checkOccurence = new RegExp("(" + text + ")", "ig");
            return value.replace(
                checkOccurence,
                "<span class='search_mark'>$1</span>"
            );
        }

        function resizePagerToContent(pagerId) {
            const p = $$(pagerId);
            let width = 0;
            const nodes = p.$view.children;
            for (let node of nodes) {
                const w = node.offsetWidth + 4; // buttons + margin
                width += w;
            }
            width += 4*4 // back and first last buttons have extra margins
            p.define({ width });
            p.resize();
        }

        return {
            view: "datatable",
            id: "hydra_log_table",
            scroll: "y",
            columns:[
                { id: "priority", header: [{
                    text: "Severity",
                    css: {
                        "font-size": "110% !important",
                        "border-bottom-color": "transparent !important"
                    },
                    height: 27,
                },
                {
                    content: "serverMultiSelectFilter",
                    options: [
                        { id: 1, value: "Alert" },
                        { id: 2, value: "Critical" },
                        { id: 3, value: "Error" },
                        { id: 4, value: "Warning" },
                        { id: 5, value: "Notice" },
                        { id: 6, value: "Info" },
                        { id: 7, value: "Debug" },
                    ],
                }],
                 width: 120, template: levelToIcons, css: {
                    // align to right
                    "text-align": "end !important",
                 } },
                { id: "message", header: [
                    {
                        text: "Description",
                        css: {
                            "font-size": "110% !important",
                            "border-bottom-color": "transparent !important"
                        },
                        height: 27,
                    },
                    {
                        content: "serverFilter",
                    }], fillspace: true, css: {"word-break": "break-word"}, template: searchColumnTemplate, },
                { id: "devicereportedtime", header:[
                    {
                        text: "Date and Time",
                        css: {
                            "font-size": "110% !important",
                            "border-bottom-color": "transparent !important"
                        },
                        height: 27,
                    },
                    {
                        content: "serverDateRangeFilter", 
                        value:{ start: new Date(), end: new Date() },
                        inputConfig: {
                            format: webix.Date.dateToStr("%m/%d")
                        },
                    }], 
                    format:webix.Date.dateToStr("%Y-%m-%d %H:%i:%s"), width: 174, cssFormat: center,
                    template: function(obj) {
                        var time = (obj.devicereportedtime).slice(0, -1) + '+09:00'
                        time = new Date(time)
                        var format = webix.Date.dateToStr("%Y-%m-%d %H:%i:%s")
                        return format(time)
                    },
                },
            ],
            url: "/api/hydralog",
            // dataFeed: "/api/hydralog",
            pager:"hydra_log_table_pager",
            fixedRowHeight:false, rowLineHeight: 27, rowHeight: 27, minRowHeight: 27,
            css:"webix_data_border webix_header_border",
            ready: function() {
                this.getFilter("priority").getList().sort((a,b)=>a.id-b.id)
            },
            on: {
                // function to center a pager
                "data->onStoreUpdated": function()  {
                    webix.delay(() => {
                        const id = this.config.pager.id;
                        resizePagerToContent(id)
                    })
                },
                onBeforeFilter: function(id, value, config) {
                    if(id === "message") searchResult = value
                },
            }
        }
    }
    init(view) {
        webix.extend(view, webix.ProgressBar);
        view.showProgress()
    }
}