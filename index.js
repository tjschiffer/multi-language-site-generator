const mustache = require('mustache');
const fs = require('fs');
const async = require('async');
const path = require('path');

const templateDirPath = '/home/tj/src/tjandnina.com/staging/templates';
const templateDataPath = '/home/tj/src/tjandnina.com/staging/templates/languageData.json';
const outputFolder = '/home/tj/src/tjandnina.com/staging'

function readTemplateData(cb) {
  fs.readFile(templateDataPath,
    'utf8',
    (err, data) => {
      if (err) throw err;
      const templateData = JSON.parse(data);
      cb(null, templateData);
    });
}

function readFile(path, cb) {
  fs.readFile(path.join(templateDirPath, mustacheTemplate),
    'utf8',
    (err, data) => {
      if (err) throw err;
      cb(null, data);
    });
}

function readTemplateDir(cb) {
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
  for (template in templates) {
    templateData['language'] = language;
    const renderedTemplate = mustache.render(templates[template], templateData);
    console.log(renderedTemplate);
  }
}

function renderTemplates(templateData, templates) {
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
    languages.forEach(language => {
      renderLanguage(language, templates, templateData[language], foldersByLanguages[language]);
    });
  });
}

async.parallel({
  templateData: readTemplateData,
  templates: readTemplateDir
}, (err, data) => {
  renderTemplates(data.templateData, data.templates);
});