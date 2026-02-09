(function () {
  // Dynamically render footer from database
  function renderFooter() {
    fetch('/api/footer-links')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var footerGrid = document.querySelector('.footer-grid');
        if (!footerGrid) return;
        
        var links = data.footerLinks || [];
        var columns = {};
        
        // Group links by column
        links.forEach(function (link) {
          if (!columns[link.column_name]) {
            columns[link.column_name] = [];
          }
          columns[link.column_name].push(link);
        });
        
        // Clear existing footer content
        footerGrid.innerHTML = '';
        
        // Render each column
        Object.keys(columns).forEach(function (columnName) {
          var columnDiv = document.createElement('div');
          columnDiv.className = 'footer-column';
          
          var heading = document.createElement('h4');
          heading.textContent = columnName;
          columnDiv.appendChild(heading);
          
          var ul = document.createElement('ul');
          ul.className = 'footer-links';
          
          columns[columnName].forEach(function (link) {
            var li = document.createElement('li');
            if (link.is_note) {
              li.className = 'footer-note';
              li.textContent = link.label;
            } else {
              var a = document.createElement('a');
              a.href = link.url;
              a.textContent = link.label;
              li.appendChild(a);
            }
            ul.appendChild(li);
          });
          
          columnDiv.appendChild(ul);
          footerGrid.appendChild(columnDiv);
        });
      })
      .catch(function (err) {
        console.error('Error loading footer links:', err);
      });
  }
  
  // Render footer on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderFooter);
  } else {
    renderFooter();
  }
})();
