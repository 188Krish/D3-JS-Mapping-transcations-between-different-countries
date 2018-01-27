(function () {
    'use strict';
    window.onload = function () {
                init(transaction, countryMap);
				setTimeout(function () {
                    document.getElementById('loader').style.display = 'none';
                }, 400)
    };
    var getCountryName = function (cntryId, countryMap) {
        for (var i = 0; i < countryMap.length; i++) {
            if (countryMap[i]["CNTRY_CODE"] === cntryId) {
                return countryMap[i]["CNTRY_NAME"];
            }
        }
    };

    function getMoneyBySenderCountry(transData, countryMap) {
        var moneyBySource = {};
        moneyBySource = transData.reduce(function (agg, n) {
            agg[n["sndr_cntry_code"]] = agg[n["sndr_cntry_code"]] || {name: getCountryName(n["sndr_cntry_code"], countryMap)};
            agg[n["sndr_cntry_code"]][n["rcvr_cntry_code"]] = (agg[n["sndr_cntry_code"]][n["rcvr_cntry_code"]] || 0) + n["spend"];
            return agg;
        }, {});
        return moneyBySource;
    };
    function getMoneyByReceiverCountry(transData, countryMap) {
        var moneyByReceiver = {};
        moneyByReceiver = transData.reduce(function (agg, n) {
            agg[n["rcvr_cntry_code"]] = agg[n["rcvr_cntry_code"]] || {name: getCountryName(n["rcvr_cntry_code"], countryMap)};
            agg[n["rcvr_cntry_code"]][n["sndr_cntry_code"]] = (agg[n["rcvr_cntry_code"]][n["sndr_cntry_code"]] || 0) + n["spend"];
            return agg;
        }, {});
        return moneyByReceiver;
    };
    function allVals(snd) {
        var arr = [];
        for (var ky in snd) {
            if (snd.hasOwnProperty(ky)) {
                arr.push(snd[ky]["total"]);
            }
        }
        return arr;
    }

    function minValue(data) {
        Object.keys(data).forEach(function (key) {
            var arr = [];
            Object.keys(data[key]).forEach(function (key2) {
                if (key2 !== 'total' && typeof data[key][key2] === 'number')
                    arr.push(data[key][key2]);
            });
            data[key].min = d3.min(arr);
        });
        return data;
    }

    function maxValue(data) {
        Object.keys(data).forEach(function (key) {
            var arr = [];
            Object.keys(data[key]).forEach(function (key2) {
                if (key2 !== 'total' && typeof data[key][key2] === 'number')
                    arr.push(data[key][key2]);
            });
            data[key].max = d3.max(arr);
        });
        return data;
    }

    function addTotals(snd) {
        for (var cntry in snd) {
            if (snd.hasOwnProperty(cntry)) {
                var sum = 0;
                for (var cntry2 in snd[cntry]) {
                    if (snd[cntry].hasOwnProperty(cntry2) && cntry2 !== 'name') {
                        sum += snd[cntry][cntry2];
                    }
                }
                snd[cntry]["total"] = Math.round(sum);
            }
        }
        snd = minValue(snd);
        snd = maxValue(snd);
        return snd;
    }

    function setCoordData(data, startX, startY, verticalGap, rectWidth, scaleFunc) {
        var tmp = verticalGap
        Object.keys(data).forEach(function (key) {
            data[key]["y"] = startY + tmp;
            data[key]["x"] = startX;
            data[key]["height"] = Math.round(scaleFunc(data[key].total));
            data[key]["width"] = rectWidth;
            tmp += (verticalGap + data[key]["height"])
        });
        return data;
    }

    function init(transaction, countryMap) {
        var sndData = addTotals(getMoneyBySenderCountry(transaction, countryMap));
        var recData = addTotals(getMoneyByReceiverCountry(transaction, countryMap));
        renderChart(sndData, recData);
    };

    function renderChart(sndData, recData) {
        var chart = d3.select('#chart-container');
        var sndHeight = d3.scaleLinear()
            .domain([d3.min(allVals(sndData)), d3.max(allVals(sndData))])
            .range([50, 700]);
        var recHeight = d3.scaleLinear()
            .domain([d3.min(allVals(recData)), d3.max(allVals(recData))])
            .range([50, 700]);
        var sndGrp = chart.append('g');
        var recGrp = chart.append('g');
        var pathGrp = chart.append('g');
        var verticalGap = 15, rectWidth = 15;
        var startX = 200, startY = 0;
        sndData = setCoordData(sndData, startX, startY, verticalGap, rectWidth, sndHeight);
        var startX2 = 1120, startY2 = 0;
        recData = setCoordData(recData, startX2, startY2, verticalGap, rectWidth, recHeight);
        //countries
        Object.keys(sndData).forEach(function (key) {
            var points = [
                {x: sndData[key].x, low: sndData[key].y, high: sndData[key].y + sndData[key].height},
                {
                    x: sndData[key].x + sndData[key].width,
                    low: sndData[key].y,
                    high: sndData[key].y + sndData[key].height
                },
            ];
            var areaGenerator = d3.area()
                .x(function (d) {
                    return d.x;
                })
                .y0(function (d) {
                    return d.low;
                })
                .y1(function (d) {
                    return d.high;
                });
            var area = areaGenerator(points);
            sndGrp.append('path').attr('d', area).attr('stroke', '#FFBC72').attr('fill', '#FFBC72');
            sndGrp.append('text').attr('x', startX - 20).attr('dy', sndData[key].y + Math.floor(sndData[key].height / 2)).text(sndData[key].name.toLowerCase()).attr('style', 'font-family: arial; font-size: 12px; text-anchor: end');

        });
        Object.keys(recData).forEach(function (key) {
            var points = [
                {x: recData[key].x, low: recData[key].y, high: recData[key].y + recData[key].height},
                {
                    x: recData[key].x + recData[key].width,
                    low: recData[key].y,
                    high: recData[key].y + recData[key].height
                },
            ];
            var areaGenerator = d3.area()
                .x(function (d) {
                    return d.x;
                })
                .y0(function (d) {
                    return d.low;
                })
                .y1(function (d) {
                    return d.high;
                });
            var area = areaGenerator(points);
            recGrp.append('path').attr('d', area).attr('stroke', '#FFBC72').attr('fill', '#FFBC72');
            recGrp.append('text').attr('x', recData[key].x + recData[key].width + 20).attr('dy', recData[key].y + Math.floor(recData[key].height / 2)).text(recData[key].name.toLowerCase()).attr('style', 'font-family: arial; font-size: 12px;');

        });

        //paths
        Object.keys(sndData).forEach(function (sender) {
            sndData[sender]["curPos"] = 0;
            Object.keys(sndData[sender]).forEach(function (receiver) {
                if(receiver !== 'name' && receiver !== 'total' && receiver !== 'curPos' && receiver !== 'x' && receiver !== 'y' && receiver !== 'height' && receiver !== 'width' && receiver !== 'min' && receiver !== 'max'){
                    recData[receiver]["curPos"] = recData[receiver]["curPos"] || 0;
                    var btm = Math.floor(sndData[sender].height * sndData[sender][receiver]/sndData[sender].total);
                    var btm2 = Math.floor(recData[receiver].height * recData[receiver][sender]/recData[receiver].total);
                    var points = [
                        {x: sndData[sender].x+rectWidth, low: sndData[sender].y + sndData[sender]["curPos"], high: sndData[sender].y + sndData[sender]["curPos"] + btm},
                        {x: recData[receiver].x, low:  recData[receiver].y +  recData[receiver]["curPos"], high: recData[receiver].y + recData[receiver]["curPos"] + btm2},
                    ];

                    var areaGenerator = d3.area().curve(d3.curveCardinal.tension(0.5))
                        .x(function (d) {
                            return d.x;
                        })
                        .y0(function (d) {
                            return d.low;
                        })
                        .y1(function (d) {
                            return d.high;
                        });
                    var area = areaGenerator(points);
                    pathGrp.append('path').attr('d', area).attr('stroke', '#FFE8B0').attr('fill', '#FFE8B0');
                    sndData[sender]["curPos"] += btm;
                    recData[receiver]["curPos"] += btm2;
                }

            });
        });
    }
})();