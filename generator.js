const mustache = require('mustache');
const fs = require('fs');
const async = require('async');
const path = require('path');

(function defineGenerator (global, factory) {
  if (typeof exports === 'object' && exports && typeof exports.nodeName !== 'string') {
    factory(exports); // CommonJS
  } else if (typeof define === 'function' && define.amd) {
    define(['exports'], factory); // AMD
  } else {
    global.Generator = {};
    factory(global.Generator); // script, wsh, asp
  }
}(this, function generatorFactory (generator) {

  function readTemplateData(templateDataPath, cb) {
    fs.readFile(templateDataPath,
      'utf8',
      (err, data) => {
        if (err) throw err;
        const templateData = JSON.parse(data);
        cb(null, templateData);
      });
  }

  function readTemplateDir(templateDirPath, cb) {
    fs.readdir(templateDirPath, (err, files) => {
      if (err) throw err;
      const mustacheTemplates = files.filter(file => path.extname(file) === '.mustache');
      async.reduce(mustacheTemplates, {}, (acc, mustacheTemplate, cb1) => {
        fs.readFile(path.join(templateDirPath, mustacheTemplate),
          'utf8',
          (err, data) => {
            if (err) throw err;
            acc[mustacheTemplate] = data;
            cb1(null, acc);
          });
      }, (err, templateData) => {
        cb(null, templateData);
      });
    });
  }

  function createDir(dir, cb) {
    fs.stat(dir, (err, stats) => {
      if (stats) {
        cb();
      } else {
        fs.mkdir(dir, (err) => {
          if (err) throw err;
          cb();
        });
      }
    });
  }

  function createDirs(dirs, cb) {
    async.each(dirs, (dir, cb) => {
      createDir(dir, cb)
    }, (err) => {
      if (err) throw err;
      cb();
    });
  }

  function renderLanguage(language, templates, templateData, saveFolder) {
    for (const template in templates) {
      if (!templates.hasOwnProperty(template)) {
        continue;
      }
      templateData['language'] = language;
      const renderedTemplate = mustache.render(templates[template], templateData);
      fs.writeFile(path.join(saveFolder, path.parse(template).name + '.html'), renderedTemplate, err => {
        if (err) throw err;
      });
    }
  }

  function renderTemplates(templateData, templates, outputFolder) {
    const languages = Object.keys(templateData);
    const foldersByLanguages = languages.reduce((acc, key) => {
      acc[key] = path.join(outputFolder, key);
      return acc;
    }, {});

    async.series([
      (cb) => {
        createDir(outputFolder, cb);
      },
      (cb) => {
        createDirs(Object.values(foldersByLanguages), cb);
      }
    ], (err) => {
      if (err) throw err;
      languages.forEach(language => {
        renderLanguage(language, templates, templateData[language], foldersByLanguages[language]);
      });
    });
  }

  generator.version = '0.9.0';

  generator.render = function render(templateDirPath, templateDataPath, outputFolder) {
    async.parallel({
      templateData: cb => {
        readTemplateData(templateDataPath, cb);
      },
      templates: cb => {
        readTemplateDir(templateDirPath, cb);
      }
    }, (err, data) => {
      if (err) throw err;
      renderTemplates(data.templateData, data.templates, outputFolder);
    });
  }
}));