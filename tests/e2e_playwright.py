from playwright.sync_api import sync_playwright
import json
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1200,'height':800})
    pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)))
    pg.on('console',lambda m:errs.append('CONSOLE '+m.text) if m.type=='error' else None)
    pg.goto('http://127.0.0.1:3000/'); pg.wait_for_timeout(800)
    for page in ['tutor','courses','attendance','scholarships','freelance','settings','home']:
        pg.click(f'.side [data-page="{page}"]'); assert pg.is_visible(f'#page-{page}'),page
    pg.click('.side [data-page="courses"]'); pg.fill('#course-name','Machine Learning'); pg.click('#course-save')
    pg.fill('#course-name','machine learning'); pg.click('#course-save')
    assert pg.locator('#course-list .card').count()==1
    pg.click('[data-act="open-course"]')
    pg.click('summary'); pg.fill('#note-name','Notes'); pg.fill('#note-text','Gradient descent minimizes a loss function by repeatedly stepping against the gradient of the loss with a learning rate.')
    pg.click('[data-act="note-add"]'); pg.wait_for_timeout(200)
    assert 'Notes' in pg.inner_text('#course-detail')
    pg.fill('#gem-input','What is gradient descent?'); pg.click('[data-act="gem-send"]'); pg.wait_for_timeout(800)
    print('gem reply:',pg.inner_text('#gem-box')[-120:].replace('\n',' '))
    pg.click('.side [data-page="attendance"]')
    pg.select_option('#tt-day',Att:=pg.evaluate("Att.weekday(Att.ymd())")); pg.fill('#tt-subject','AI'); pg.fill('#tt-start','00:00'); pg.fill('#tt-end','00:30'); pg.click('[data-act="tt-add"]')
    pg.click('#att-today [data-st="present"]'); print('summary:',pg.inner_text('#att-sum')[:90].replace('\n',' '))
    pg.click('.side [data-page="scholarships"]'); pg.fill('#sch-name','<img src=x onerror=window.XSS=1>'); pg.fill('#sch-link','javascript:alert(1)'); pg.click('#sch-save')
    print('bad link toast:',pg.inner_text('#toast'))
    pg.fill('#sch-link','https://hec.gov.pk'); pg.fill('#sch-deadline','2099-01-01'); pg.click('#sch-save')
    assert pg.evaluate('window.XSS')is None and pg.locator('#sch-list img').count()==0
    pg.reload(); pg.wait_for_timeout(500); pg.click('.side [data-page="scholarships"]'); assert pg.locator('#sch-list .card').count()==1
    pg.set_viewport_size({'width':375,'height':700}); pg.click('.bottom [data-page="home"]'); pg.wait_for_timeout(300)
    print('h-overflow:',pg.evaluate('document.documentElement.scrollWidth>innerWidth'))
    b.close()
print('ERRORS:',errs)
