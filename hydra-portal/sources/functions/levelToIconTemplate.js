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
export function levelToIcons(data, type, value) {
    if(data.$group) {
        return ""
    }
    var icon = ""
    switch(value) {
        case 0: 
            break;
        case 1:
            icon = "<span class='webix_icon mdi mdi-close-circle' style='color: red'></span>"
            break;
        case 2:
            icon = "<span class='webix_icon mdi mdi-close-circle' style='color: #D32F2F'></span>"
            break;
        case 3:
            icon = "<span class='webix_icon mdi mdi-alert-circle' style='color: #B71C1C'></span>"
            break;
        case 4:
            icon = "<span class='webix_icon mdi mdi-alert' style='color: orange'></span>"
            break;
        case 5:
            icon = "<span class='webix_icon mdi mdi-information' style='color: #BDBDBD'></span>"
            break;
        case 6:
            icon = "<span class='webix_icon mdi mdi-information' style='color: #9CCC65'></span>"
            break;
        case 7:
            icon = "<span class='webix_icon mdi mdi-list-box-outline'></span>"
            break;
    }
    return icon
}

export function center(value, config, rowId, columnId) {
    var line_height = 0
    if(config.$height) {
        var line_height = (config.$height).toString() + "px !important"
    } else {
        line_height = "27px !important"
    }

    if(columnId === "priority") {
        return {
            "line-height": line_height,
            "text-align": "center",
            "padding": "0px !important"
        }
    }
    return {
        "line-height": line_height,
        "text-align": "center"
    }
}

export function centerIcon(value, config, rowId, columnId) {
    var line_height = 0
    if(config.$height) {
        var line_height = (config.$height).toString() + "px !important"
    } else {
        line_height = "27px !important"
    }

    return {
        "line-height": line_height,
        "text-align": "center",
        "padding": "0px 0px 0px 9px !important"
    }
}