const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const { WebhookClient } = require("discord.js")
const PORT = 3000 || process.env.PORT
const lineNotify = require('line-notify-nodejs')('pjLFmKaRFgJrgeO0WjGbqmloRIXpcj2VwdJQttDoCYr');
const path = require("path");
mongoose.connect("mongodb+srv://oangsa:oangsa58528@cluster0.q9lfhle.mongodb.net/?retryWrites=true&w=majority", {useNewUrlParser: true}, {useUnifiedTopology: true})

wh = new WebhookClient({
    token: 'OXGg2D3-PHWTAgJsUM5DDyB3LGP2zWxLMzOuFyVcddEPepHKoMS2evi0r81IqujneaFx',
    id: '1014200734146904065',
    url: 'https://discord.com/api/webhooks/1014200734146904065/OXGg2D3-PHWTAgJsUM5DDyB3LGP2zWxLMzOuFyVcddEPepHKoMS2evi0r81IqujneaFx'
})


app.use(bodyParser.urlencoded({extended: true}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


const notesSchema = {
    name: String,
    total_days: Number,
    dates: Array
}

const Note = mongoose.model("RS", notesSchema)

app.get("/", function(req,res,next) {
    res.render("index")
    next();
})

app.post("/", async function(req,res) {
        const name = req.body.name
        const reason = req.body.reason
        const half = req.body.half_day
        const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
        const d = new Date(req.body.fdate).toLocaleDateString('TH-th', options)
        let fdate_1 = new Date(req.body.fdate).toLocaleDateString('en-US');
        let THdate_1 = new Date(req.body.fdate).toLocaleDateString('TH-th');
        let date_1 = new Date(fdate_1);
        let date_2 = new Date(fdate_1);
        if (reason == "sick"){
            var freason = "ป่วย"
        } 
        else if (reason == "covid"){
            var freason = "ป่วย"
        }
        else if (reason == "quarantine") {
            var freason = "เสี่ยงสูง"
        }
        else if (reason == "parent_activity") {
            var freason = "ไปธุระกับผปค."
        }
        else if (reason == "personal_activity") {
            var freason = "กิจกรรม"
        }

        var day = d

        if (half) {
            var day = `${d}(${half})`
        }
        
        function isBeforeToday(date) {
            const today = new Date();
          
            today.setHours(0, 0, 0, 0);
          
            return date < today;
          }
        const getBusinessDatesCount = (startDate, endDate) => {
            let count = 0;
            let curDate = +startDate;
            while (curDate <= +endDate) {
              const dayOfWeek = new Date(curDate).getDay();
              const isWeekend = (dayOfWeek === 6) || (dayOfWeek === 0);
              if (!isWeekend) {
                count++;
              }
              curDate = curDate + 24 * 60 * 60 * 1000
            }
            return count;
          }
        const diff = getBusinessDatesCount(date_1, date_2);
        if (name == "" || !reason || d == "Invalid Date"){
            error_msg = "กรุณากรอกข้อมูลให้ครบ!"
            res.render('index', {
                error: error_msg,
                old_data: req.body
            })
        } 
        else if (diff == 0) {
            error_msg = "คุณไม่สามารถลาในวันหยุดได้(weekend)!"
            res.render('index', {
                error: error_msg,
                old_data: req.body
            })
        }
        else {
            Note.findOne({"name":name}, function(err, result) {
                if (!result) {
                    if (isBeforeToday(new Date(req.body.fdate))) {
                        error_msg = "คุณไม่สามารถเลือกวันที่จะลาเป็นวันที่เกิดขึ้นก่อนวันนี้ได้!"
                        res.render('index', {
                            error: error_msg,
                            old_data: req.body
                        })
                    } else {
                        let newNote = new Note({
                            name: name,
                            total_days: diff,
                            dates: THdate_1
                        })
                        newNote.save();
                        succ_msg = "ระบบบันทึกข้อมูลเรียบร้อย!"
                        res.render('index', {
                            success: succ_msg,
                            old_data: req.body
                        })
                        lineNotify.notify({
                            message: `\nชื่อ: ${name}\nลาวันที่: ${day}\nเนื่องจาก: ${freason}`,
                        })
                        const logEmbed = {
                            title: name,
                            description: `\`\`\`ini\nDate\n ⤷ ${day}\nReason\n ⤷ ${freason}\nDate Count\n ⤷ ${diff}\`\`\``,
                            color: 0x99CCFF
                        };
                    
                        wh.send({
                            username: "log",
                            embeds: [logEmbed]
                        })
                    }
                } else {
                    Note.findOne({"name":name}, function(err, result) {
                        let pass = true
                        for (var i = 0, ln = result["dates"].length; i < ln; i++) {
                            if (THdate_1.indexOf(result["dates"][i]) !== -1) {
                              pass = false;
                              break;
                            }
                        }
                        if (pass == true) {
                            if (isBeforeToday(new Date(req.body.fdate))) {
                                error_msg = "คุณไม่สามารถเลือกวันที่จะลาเป็นวันที่เกิดขึ้นก่อนวันนี้ได้!"
                                res.render('index', {
                                    error: error_msg,
                                    old_data: req.body
                                })
                            } else {
                                Note.updateOne({"name":name}, 
                                {total_days:(result["total_days"] + diff), $push: { "dates": THdate_1 } }, function (err, docs) {
                                    if (err){
                                        console.log(err)
                                    } else {
                                        succ_msg = "ระบบบันทึกข้อมูลเรียบร้อย!"
                                        res.render('index', {
                                            success: succ_msg,
                                            old_data: req.body
                                        })
                                        const logEmbed = {
                                            title: name,
                                            description: `\`\`\`ini\nDate\n ⤷ ${day}\nReason\n ⤷ ${freason}\nDate Count\n ⤷ ${diff}\`\`\``,
                                            color: 0x99CCFF
                                        };
                                    
                                        wh.send({
                                            username: "log",
                                            embeds: [logEmbed]
                                        })
                            
                                        lineNotify.notify({
                                            message: `\nชื่อ: ${name}\nลาวันที่: ${day}\nเนื่องจาก: ${freason}`,
                                        })
                                    }
                                });
                            }
                        }
                        if (pass == false) {
                            error_msg = "คุณได้ทำการลาในวันนั้นไปแล้ว!"
                            res.render('index', {
                                error: error_msg,
                                old_data: req.body
                            })
                        }
                    })
                }
            })
        }
    }
)

app.listen(PORT , function() {
    console.log(`Server is running on port ${PORT}`)
})