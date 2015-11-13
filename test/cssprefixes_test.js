/**
 * Description: Test the CSS prefix completeness detection.
 *
 * Copyright (c) Microsoft Corporation; All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this
 * file except in compliance with the License. You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * THIS CODE IS PROVIDED AS IS BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER
 * EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OR CONDITIONS
 * OF TITLE, FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABLITY OR NON-INFRINGEMENT.
 *
 * See the Apache Version 2.0 License for specific language governing permissions
 * and limitations under the License.
 */

"use strict";

var cssprefixes = require('../lib/checks/check-cssprefixes.js'),
    url = require('url'),
    config = require('../lib/checks/config.js'),
    cssloader = require('../lib/checks/loadcss.js'),
    request = require('request'),
    cheerio = require('cheerio'),
    path = require('path'),
    whitelistReader = require('../lib/checks/loadwhitelist.js'),
    testServer = require('../static/test-server.js'),
    testUrl = 'http://localhost:' + testServer.port + '/cssprefixes-';

var globalWhitelistedProperties = whitelistReader.load(path.join(__dirname, "../lib/checks/whitelisted-properties.json"));

function checkPage(page, expected, whitelistedProperties) {
    return function (test) {
        cssprefixes.whitelist(whitelistedProperties);
        var uri = page.indexOf('http') === 0 ? page : testUrl + page,
            tests = 1;

        if (expected.data) {
            tests += Object.keys(expected.data).length;
        }

        test.expect(tests);

        request({uri: uri,
                headers: {'user-agent': config.user_agent_edge}},
            function (error, response, content) {
                var website = {
                    url: url.parse(uri),
                    content: content,
                    $: cheerio.load(content)
                };

                cssloader.loadCssFiles(website)
                    .then(cssprefixes.check)
                    .then(function (result) {
                        test.equal(result.passed, expected.passed, uri + " passed: " + result.passed + " !== " + expected.passed);

                        if (expected.data) {
                            for (var key in expected.data) {
                                test.strictEqual(result.data[key], expected.data[key], uri + " " + key + " " + result.data[key] + " !== " + expected.data[key]);
                            }
                        }
                        test.done();
                    });
            });
    };
}

module.exports['CSS Prefixes'] = {
    'No CSS': checkPage("1.html", {passed: true}),
    'Simple CSS with no CSS3': checkPage("2.html", { passed: true }),
    /* Imported CSS files */
    'Imports using url(), inline': checkPage("17.html", { passed: true }),
    'Imports using single quote, included': checkPage("18.html", { passed: true }),
    'Imports using quoted url(), included': checkPage("19.html", { passed: true }),
    'Cycle import': checkPage("20.html", { passed: true }),
    /* Only standard properties, no webkit, no whitelist */
    'Unprefixed version of rules': checkPage("3.html", {passed: true}),
    'Simple CSS + Unprefixed version': checkPage("4.html", {passed: true}),
    'Transform': checkPage("5.html", {passed: true}),
    'Transitions': checkPage("6.html", {passed: true}),
    'Gradients': checkPage("7.html", {passed: true}),
    'Animations': checkPage("8.html", {passed: true}),
    'Gradients + Transforms': checkPage("13.html", { passed: true }),
    'Embed All + Standard Transform': checkPage("15.html", { passed: true }),
    'Embed Webkit + Standard Transform': checkPage("16.html", { passed: true }),
    /* Only webkit properties, no standard, no whitelist */
    'Missing Standard Transform': checkPage("9.html", {passed: false}),
    'Missing Standard Transitions': checkPage("10.html", {passed: false}),
    'Missing Standard Animations': checkPage("12.html", {passed: false}),
    'Missing Standard Gradients': checkPage("11.html", { passed: false }),
    'Gradients + Missing Transforms': checkPage("14.html", { passed: false }),
    /* Whitelisted properties */
    'Missing prefixes but whitelisted all': checkPage("22.html", { passed: true }, ["transform", "animation"]),
    'Missing prefixes, none whitelisted': checkPage("22.html", { passed: false }, []),
    'Missing prefixes, only one whitelisted': checkPage("22.html", { passed: false }, ["transform"]),
    /* Configured Whitelisted properties (source: whitelisted-properites.json) */
    'Whitelisted padding & margin prefixes': checkPage("23.html", { passed: true }, globalWhitelistedProperties),
    'Whitelisted selectors': checkPage("24.html", { passed: true })
};