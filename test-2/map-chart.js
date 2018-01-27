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

    function appendLocationData(data) {
        for (var cntry in data) {
            if (data.hasOwnProperty(cntry)) {
                let temp = locationData.filter(function (ele) {
                    return ele.country === cntry
                });
                if (typeof temp !== 'undefined' && Array.isArray(temp) && temp.length > 0) {
                    data[cntry].location = temp[0];
                    for (var cntry2 in data[cntry]) {
                        if (data[cntry].hasOwnProperty(cntry2) && cntry2 !== 'name') {
                            let temp2 = locationData.filter(function (ele) {
                                return ele.country === cntry2
                            });
                            if (typeof temp2 !== 'undefined' && Array.isArray(temp2) && temp2.length > 0) {
                                data[cntry][cntry2] = {
                                    value: data[cntry][cntry2],
                                    location: temp2[0]
                                }
                            }
                        }
                    }

                }

            }
        }
        return data;
    }

    function init(transaction, countryMap) {
        var sndData = addTotals(getMoneyBySenderCountry(transaction, countryMap));
        var recData = addTotals(getMoneyByReceiverCountry(transaction, countryMap));
        renderChart(sndData, recData);
    };

    function generateArcs(sndData, recData) {
        var sndStrokeWidth = d3.scale.linear()
            .domain([d3.min(allVals(sndData)), d3.max(allVals(sndData))])
            .range([0.1, 12]);
        var sndStrokeOpacity = d3.scale.linear()
            .domain([d3.min(allVals(sndData)), d3.max(allVals(sndData))])
            .range([0.1, 0.8]);

        var withLocationData = appendLocationData(sndData);
        var arcs = [];
        for (var cntry in withLocationData) {
            if (withLocationData.hasOwnProperty(cntry)) {
                for (var cntry2 in withLocationData[cntry]) {
                    if (withLocationData[cntry].hasOwnProperty(cntry2) && (typeof withLocationData[cntry][cntry2] === 'object' && (!!withLocationData[cntry][cntry2].value))) {
                        arcs.push({
                            origin: {
                                latitude: withLocationData[cntry].location.latitude,
                                longitude: withLocationData[cntry].location.longitude
                            },
                            destination: {
                                latitude: withLocationData[cntry][cntry2].location.latitude,
                                longitude: withLocationData[cntry][cntry2].location.longitude
                            },
                            options: {
                                strokeWidth: sndStrokeWidth(withLocationData[cntry][cntry2].value),
                                strokeColor: 'rgba(100, 10, 200, 0.4)',
                                greatArc: true,
                                strokeOpacity: sndStrokeOpacity(withLocationData[cntry][cntry2].value),
                                strokeDasharray: "0.7"
                            }
                        });
                    }
                }
            }
        }
        return arcs;
    }

    function renderChart(sndData, recData) {
// render map
        var map = new Datamap({
            element: document.getElementById('chart-container'),
            projection: 'mercator', // big world map
            // countries don't listed in dataset will be painted with this color
            fills: {defaultFill: '#F5F5F5'},
            data: {},
            geographyConfig: {
                borderColor: '#DEDEDE',
                highlightBorderWidth: 2,
                // don't change color on mouse hover
                highlightFillColor: function (geo) {
                    return geo['fillColor'] || '#F5F5F5';
                },
                // only change border
                highlightBorderColor: '#B7B7B7'
            }
        });

        var arcs = generateArcs(sndData, recData);
        var a = [
            {
                origin: {
                    latitude: 30.194444,
                    longitude: -97.67
                },
                destination: {
                    latitude: 25.793333,
                    longitude: -80.290556
                },
                options: {
                    strokeWidth: 9,
                    strokeColor: 'rgba(100, 10, 200, 0.4)',
                    greatArc: true
                }
            },
            {
                origin: {
                    latitude: 39.861667,
                    longitude: -104.673056
                },
                destination: {
                    latitude: 35.877778,
                    longitude: -78.7875
                }
            }
        ];
        map.arc(arcs, {strokeWidth: 1, arcSharpness: 1.4});

    }
})();