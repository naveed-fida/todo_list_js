var templates = {},
  $new_form = $('#new'),
  $edit_form = $('#overlay');

  function showNewForm(e) {
    e.preventDefault();
    $new_form.show();
  }

  function hideNewForm() {
    $new_form.hide();
  }

  function hideEditForm() {
    $edit_form.hide();
    $edit_form.find('#message').text('');
    $edit_form.find('form')[0].reset();
  }

  function invalidNew() {
    return $new_form.find('[name="title"]').val() === '';
  }

  function validEdit() {
    var day = $edit_form.find('#day').val(),
        month = $edit_form.find('#month').val(),
        year = $edit_form.find('#year').val(),
        regexp = /^[0-9]{2}$/;

    var empty_date = day === '' && month === '' && year === '',
        valid_title = $edit_form.find('[name="title"]').val() !== '',
        valid_date = regexp.test(day) && regexp.test(month) && regexp.test(year);

    if (valid_title) {
      if(valid_date) { return true; }
      if(empty_date) { return "empty_date" }
    } else {
      return false;
    }
    return false;
  }

  function getFormatedDate() {
    var day = $edit_form.find('#day').val(),
        month = $edit_form.find('#month').val(),
        year = $edit_form.find('#year').val();

    return day + "/" + month + "/" + year;
  };

  function getDateGroups(collection) {
    var due_dates = [];
    collection.forEach(function(item) {
      due_dates.push(item.due_date);
    });

    due_dates = due_dates.map(function(date) {
      return date.substr(3);
    });

    var unique_dates = [];
    due_dates.forEach(function(date) {
      if(unique_dates.indexOf(date) === -1) { unique_dates.push(date); }
    });

    var groups = {};
    unique_dates.forEach(function(ud) {
      groups[ud] = groups[ud] || 0;
      due_dates.forEach(function(dd) {
        if (dd === ud) { groups[ud] += 1; }
      });
    });

    var group_objects = [];
    for(group in groups) {
      if (group === '') {
        group_objects.push({due_date: "No Due Date", count: groups[group]});
      } else {
        group_objects.push({due_date: group, count: groups[group]});
      }
    }
    return group_objects;
  }

  function fillEditForm(item) {
    $edit_form.find('input').val(item.title);
    $edit_form.find('[type="hidden"]').val(item.id);
    $edit_form.find('textarea').text(item.description);
    $edit_form.find('#day').val(item.due_date.substr(0, 2));
    $edit_form.find('#month').val(item.due_date.substr(3, 2));
    $edit_form.find('#year').val(item.due_date.substr(6, 2));
  }


  function updateListItem($li, item) {
    $li.find('a').text(item.title);
    $li.find('span').text(item.due_date);
  }

$(function() {
  $('[type*="x-handlebars"]').each(function() {
    var $template = $(this);
    templates[$template.attr('id')] = Handlebars.compile($template.html());
  });

  $('[data-type=partial]').each(function() {
    var $partial = $(this);
    Handlebars.registerPartial($partial.attr('id'), $partial.html());
  });

  var todo_list = {
    collection: [],
    currentId: 0,

    retrieveData: function() {
      var collection = JSON.parse(localStorage.getItem('collection')),
          id = +localStorage.getItem('id');
      if (collection) { this.collection = collection; }
      if (id) { this.currentId = id; }
    },

    storeData: function(e) {
      localStorage.setItem('collection', JSON.stringify(this.collection));
      localStorage.setItem('id', this.currentId);
    },

    renderMenu: function() {
      if (this.collection.length === 0) { return; }
      this.populateAllMenu();
      this.populateCompletedMenu();
    },

    renderAll: function(e) {
      if (e) { e.preventDefault(); }
      $('.current').removeClass('current');
      $('#all').addClass('current');

      $('nav #all').find('span').text(this.collection.length);
      $('main h2').text("All Todos").append($('<span>').text(this.collection.length));

      if (this.collection.length === 0) { return; }
      var completed = this.getCompleted(this.collection),
          incomplete = this.getIncomplete(this.collection);

      $('#todos ul').html(templates.list({ list: incomplete }));

      completed.forEach(function(item) {
        $('#todos ul').append($(templates.list_item(item)).addClass('completed'));
      });

    },

    renderAllMonthly: function(e) {
      e.preventDefault();
      $('.current').removeClass('current');
      var month = $(e.currentTarget).addClass('current').attr('data-month');
      var monthly_list = this.getMonthlyList(month, this.collection);

      var completed = this.getCompleted(monthly_list);
      var incomplete = this.getIncomplete(monthly_list);

      $('#todos ul').html(templates.list({list: incomplete}));
      completed.forEach(function(item) {
        $('#todos ul').append($(templates.list_item(item)).addClass('completed'));
      });
      $('main h2').text(month).append($('<span>').text(monthly_list.length));
    },

    renderAllCompleted: function(e) {
      e.preventDefault();
      $('.current').removeClass('current');
      $(e.currentTarget).addClass('current');
      var collection = this.getCompleted(this.collection);
      $('main h2').text("Completed").append($('<span>').text(collection.length));
      $('#todos ul').html(templates.list({list: collection})).find('li').addClass('completed');
    },

    renderCompletedMonthly: function(e) {
      e.preventDefault();
      $('.current').removeClass('current');
      var month = $(e.currentTarget).addClass('current').attr('data-month');
      var collection = this.getCompleted(this.collection);
      var monthly_list = this.getMonthlyList(month, collection);
      $('#todos ul').html(templates.list({list: monthly_list})).find('li').addClass('completed');
      $('main h2').text("Completed: " + month).append($('<span>').text(monthly_list.length));
    },

    getCompleted: function(collection) {
      return collection.filter(function(item) {
        return item.completed;
      });
    },

    getIncomplete: function(collection) {
      return collection.filter(function(item) {
        return !item.completed;
      });
    },

    populateAllMenu: function() {
      $('nav ul.all').html(templates.nav_all({groups: getDateGroups(this.collection)}));
    },

    populateCompletedMenu: function() {
      var groups = getDateGroups(this.getCompleted(this.collection));
      $('nav ul.completed').html(templates.nav_all({groups: groups}));
    },

    getItem: function(id) {
      return this.collection.find(function(item) {
        return item.id === id;
      });
    },

    add: function() {
      this.currentId += 1;
      var item = {
        id: this.currentId,
        title: $new_form.find('[name="title"]').val(),
        due_date: '',
        description: '',
        completed: false
      };

      this.collection.push(item);
      return item;
    },

    remove: function(id) {
      this.collection = this.collection.filter(function(item) {
        return item.id !== id;
      });
    },

    update: function(id) {
      var item = this.getItem(id);
      item.title = $edit_form.find('#title').val();
      item.description = $edit_form.find('#description').val();
      if (validEdit() !== 'empty_date') { item.due_date = getFormatedDate(); }
      return item;
    },

    done: function(id) {
      item = this.getItem(id);
      item.completed = true;
    },

    newItem: function(e) {
      e.preventDefault();
      if (invalidNew()) { return; }
      var item = this.add();
      $('#todos ul').prepend(templates.list_item(item));
      this.updateListCount(this.collection);
      this.populateAllMenu();
      this.renderAll();
      $new_form[0].reset();
    },

    deleteItem: function(e) {
      e.preventDefault();
      var id = +this.findParent(e).remove().attr('data-id');
      this.remove(id);
      var month, collection, group;

      if ($('#completed.current').length === 1) {
        month = $('#completed').attr('data-month');
        collection = this.getCompleted(this.collection);
      } else if ($("#all.current").length === 1) {
        month = $('#all').attr('data-month');
        collection = this.collection;
      } else if ($('li a.current').closest('ul.all').length === 1) {
        month = $('li a.current').attr('data-month');
        group = "all";
        collection = this.getMonthlyList(month, this.collection)
      } else {
        month = $('li a.current').attr('data-month');
        group = "completed"
        collection = this.getMonthlyList(month, this.getCompleted(this.collection))
      }
      this.populateAllMenu();
      this.populateCompletedMenu();
      this.updateListCount(collection);
      this.resetSelected(month, group);
    },

    updateItem: function(e) {
      e.preventDefault();
      if(!validEdit()) {
        $edit_form.find('#message').text('Must input a title and an empty or valid date: dd-mm-yy');
        return;
      }
      var id = +$edit_form.find(':hidden').val(),
          $li = $("li[data-id=" + id + "]"),
          item = this.update(id);
      updateListItem($li, item);
      this.populateAllMenu(this.collection);
      hideEditForm();
    },

    markComplete: function(e) {
      e.preventDefault();
      var id = +$edit_form.find(':hidden').val(),
          $li = $("li[data-id=" + id + "]");
      
      this.done(id);

      $li.remove().addClass('completed').appendTo("#todos > ul");
      hideEditForm();
      this.populateCompletedMenu();
    },

    showEditForm: function(e) {
      e.preventDefault();
      var id = +this.findParent(e).attr('data-id'),
          item = this.getItem(id);
      fillEditForm(item);
      $edit_form.fadeIn(200);
    },

    updateListCount: function(collection) {
      $('nav h2').find('span').text(this.collection.length);
      $('main h2').find('span').text(collection.length)
    },

    getMonthlyList: function(month, collection) {
      var monthly_list;
      if (month === 'No Due Date') {
        monthly_list = collection.filter(function(item) {
          return item.due_date === '';
        });
      } else {
        monthly_list = collection.filter(function(item) {
          return new RegExp(month).test(item.due_date);
        });
      }
      return monthly_list;
    },

    resetSelected: function(month, group) {
      if (month === 'completed') {
        $('#completed').addClass('current');
      } else if (($('nav ul.' + group + ' [data-month="' + month + '"]').length === 0) || (month === 'all')) { 
        $('#all').trigger('click');
      } else {
        $('nav ul.' + group + ' [data-month="' + month + '"]').addClass('current');
      }
    },

    findParent: function(e) {
      return $(e.currentTarget).closest('li');
    },

    bind: function() {
      $(window).unload(this.storeData.bind(this));
      $('nav #all').on('click', this.renderAll.bind(this));
      $('nav #completed').on('click', this.renderAllCompleted.bind(this));
      $('button.add').on('click', this.newItem.bind(this));
      $('#todos').on('click', 'button.destroy', this.deleteItem.bind(this));
      $('#todos').on('click', 'ul a', this.showEditForm.bind(this));
      $('#save').on('click', this.updateItem.bind(this));
      $('#mark_complete').on('click', this.markComplete.bind(this));
      $('nav ul.all').on('click', 'a', this.renderAllMonthly.bind(this));
      $('nav ul.completed').on('click', 'a', this.renderCompletedMonthly.bind(this));
    },

    init: function() {
      this.bind();
      this.retrieveData();
      this.renderMenu();
      $('nav #all').trigger('click');
    }
  }

  todo_list.init();

  $('#add_todo').on('click', showNewForm);

  $('#overlay').on('click', hideEditForm).children().on('click', function(e) {
    e.stopPropagation();
  });

  $('button.cancel').on('click', function(e) {
    e.preventDefault();
    hideNewForm();
  });
});
