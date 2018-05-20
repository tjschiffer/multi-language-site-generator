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

  /**
   *
   * @param templateDataPath
   * @param cb
   */
  function readTemplateData(templateDataPath, cb) {
    fs.readFile(templateDataPath,
      'utf8',
      (err, data) => {
        const templateData = JSON.parse(data);
        cb(err, templateData);
      });
  }

  /**
   *
   * @param templateDirPath
   * @param cb
   */
  function readTemplateDir(templateDirPath, cb) {
    fs.readdir(templateDirPath, (err, files) => {
      if (err) {
        cb(err);
      }
      const mustacheTemplates = files.filter(file => path.extname(file) === '.mustache');
      async.reduce(mustacheTemplates, {}, (acc, mustacheTemplate, cb1) => {
        fs.readFile(path.join(templateDirPath, mustacheTemplate),
          'utf8',
          (err, data) => {
            acc[mustacheTemplate] = data;
            cb1(err, acc);
          });
      }, (err, templateData) => {
        cb(err, templateData);
      });
    });
  }

  /**
   * Create the directory if it does not exist
   *
   * @param dir
   * @param cb
   */
  function createDir(dir, cb) {
    fs.stat(dir, (err, stats) => {
      if (stats) {
        cb();
      } else {
        fs.mkdir(dir, (err) => {
          cb(err);
        });
      }
    });
  }

  /**
   *
   * @param dirs
   * @param cb
   */
  function createDirs(dirs, cb) {
    async.each(dirs, (dir, cb) => {
      createDir(dir, cb)
    }, (err) => {
      cb(err);
    });
  }

  /**
   *  Render each template in the language provided
   *
   * @param language
   * @param templates
   * @param templateData
   * @param saveFolder
   * @param cb
   */
  function renderLanguage(language, templates, templateData, saveFolder, cb) {
    async.eachOf(templates, (template, templateName, cb1) => {
      templateData['language'] = language;
      const renderedTemplate = mustache.render(template, templateData);
      fs.writeFile(path.join(saveFolder, path.parse(templateName).name + '.html'), renderedTemplate, err => {
        cb1(err);
      });
    }, err => {
      cb(err);
    });
  }

  /**
   *
   * @param templateData
   * @param templates
   * @param outputFolder
   * @param cb
   */
  function renderTemplates(templateData, templates, outputFolder, cb) {
    const languages = Object.keys(templateData);
    const foldersByLanguages = languages.reduce((acc, key) => {
      acc[key] = path.join(outputFolder, key);
      return acc;
    }, {});

    async.series([
      cb => {
        createDir(outputFolder, cb);
      },
      cb => {
        createDirs(Object.values(foldersByLanguages), cb);
      },
      cb => {
        async.each(languages, (language, cb1) => {
          renderLanguage(language, templates, templateData[language], foldersByLanguages[language], cb1);
        }, err => {
          cb(err);
        });
      }
    ], (err) => {
      cb(err);
    });
  }

  /**
   *
   * @type {string}
   */
  generator.version = '0.9.0';

  /**
   *
   * @param templateDirPath
   * @param templateDataPath
   * @param outputFolder
   * @param cb
   */
  generator.render = function render(templateDirPath, templateDataPath, outputFolder, cb) {
    async.parallel({
      templateData: cb => {
        readTemplateData(templateDataPath, cb);
      },
      templates: cb => {
        readTemplateDir(templateDirPath, cb);
      }
    }, (err, data) => {
      renderTemplates(data.templateData, data.templates, outputFolder, cb);
    });
  }
}));
